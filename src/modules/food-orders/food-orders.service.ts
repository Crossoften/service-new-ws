import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import {
  ChatContextType,
  DeliveryFeeTypeEnum,
  FoodOrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  Prisma,
  User,
} from '@prisma/client';
import { CreateFoodOrderDto } from './dto/create-food-order.dto';
import { DeliveryAddressDto } from './dto/delivery-address.dto';
import { RespondFoodOrderDto } from './dto/respond-food-order.dto';
import { CancelFoodOrderDto } from './dto/cancel-food-order.dto';
import { isSettledOffPlatform } from '../restaurants/card-machine';
import { calculateCommission, resolveCommissionRate } from './commission';
import { QueryFoodOrderDto } from './dto/query-food-order.dto';
import {
  CreateFoodOrderResponseDto,
  ResponseFindAllFoodOrderDto,
  ResponseFoodOrderDto,
} from './dto/response-food-order.dto';
import { PayFoodOrderDto } from './dto/pay-food-order.dto';
import { PayFoodOrderResponseDto } from './dto/pay-food-order-response.dto';
import { FoodOrderCheckoutNotAvailableException } from './exceptions/food-order-checkout-not-available.exception';
import { FoodOrderPaymentNotConfirmableException } from './exceptions/food-order-payment-not-confirmable.exception';
import { FoodOrderNotFoundException } from './exceptions/food-order-not-found.exception';
import { FoodOrderAccessDeniedException } from './exceptions/food-order-access-denied.exception';
import { FoodOrderInvalidStatusException } from './exceptions/food-order-invalid-status.exception';
import { RestaurantClosedException } from './exceptions/restaurant-closed.exception';
import { FoodOrderRestaurantNotFoundException } from './exceptions/food-order-restaurant-not-found.exception';
import { FoodOrderMenuItemNotFoundException } from './exceptions/food-order-menu-item-not-found.exception';
import { FoodOrderAddressRequiredException } from './exceptions/food-order-address-required.exception';
import { FoodOrderInvalidScheduleException } from './exceptions/food-order-invalid-schedule.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { MercadoPagoAccountsService } from '../mercado-pago/mercado-pago-accounts.service';
import { PaymentReferenceTypeEnum } from '../works/enums/payment-reference-type.enum';
import { distanceInKm } from '@utils/haversine';
import { randomUUID } from 'crypto';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CouponsService } from '../coupons/coupons.service';

const DEFAULT_DELIVERY_FEE = 8;

@Injectable()
export class FoodOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly mercadoPagoAccounts: MercadoPagoAccountsService,
    private readonly subscriptionGuard: SubscriptionGuardService,
    private readonly couponsService: CouponsService,
  ) {}

  private readonly deliveryAddressSelect = Prisma.validator<Prisma.AddressSelect>()({
    id: true,
    street: true,
    number: true,
    neighborhood: true,
    city: true,
    state: true,
    zipCode: true,
    latitude: true,
    longitude: true,
  });

  private readonly foodOrderSelect = Prisma.validator<Prisma.FoodOrderSelect>()({
    id: true,
    status: true,
    address: { select: this.deliveryAddressSelect },
    itemsValue: true,
    deliveryFee: true,
    tip: true,
    discount: true,
    totalValue: true,
    platformFeeRate: true,
    commissionAmount: true,
    paymentMethod: true,
    paymentStatus: true,
    scheduledFor: true,
    paidAt: true,
    notes: true,
    cancelReason: true,
    acceptedAt: true,
    cancelledAt: true,
    deliveredAt: true,
    createdAt: true,
    updatedAt: true,
    restaurant: { select: { id: true, name: true, imageUrl: true, userId: true } },
    customer: { select: { id: true, name: true, fileUrl: true } },
    items: {
      select: {
        id: true,
        menuItemId: true,
        quantity: true,
        unitPrice: true,
        notes: true,
        menuItem: { select: { name: true } },
        additions: {
          select: { menuItemAddition: { select: { id: true, name: true, price: true } } },
        },
      },
    },
    deliveryAssignment: {
      select: {
        id: true,
        status: true,
        courierId: true,
        currentLat: true,
        currentLng: true,
        locationUpdatedAt: true,
      },
    },
  });

  async create(user: User, payload: CreateFoodOrderDto): Promise<CreateFoodOrderResponseDto> {
    // Sem endereço no pedido, cai no do cadastro. Sem nenhum dos dois, não há
    // para onde entregar.
    if (!payload.deliveryAddress && !user.addressId) throw new FoodOrderAddressRequiredException();

    const scheduledFor = this.parseSchedule(payload.scheduledFor);

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: payload.restaurantId },
      select: {
        id: true,
        isActive: true,
        isOpen: true,
        userId: true,
        name: true,
        address: { select: { latitude: true, longitude: true } },
        usesOwnCardMachine: true,
        user: { select: { mpUserId: true, mpAccessToken: true } },
      },
    });
    if (!restaurant || !restaurant.isActive) throw new FoodOrderRestaurantNotFoundException();
    if (!restaurant.isOpen) throw new RestaurantClosedException();

    // Decidido uma vez, na criação, e gravado no pedido: é daqui que saem as
    // três consequências — se há checkout com split, se a confirmação é manual
    // e se o entregador é creditado pelo frete. Deduzir do restaurante na hora
    // de ler faria um pedido antigo mudar de natureza quando o estabelecimento
    // ligasse ou desligasse a maquininha.
    const settledOffPlatform = isSettledOffPlatform(
      payload.paymentMethod,
      restaurant.usesOwnCardMachine,
    );

    // A exigência de conta vinculada vale só para o que passa pelo gateway.
    // Dinheiro é liquidado em mãos, e cartão na maquininha do estabelecimento
    // também — bloquear por falta de vínculo derrubaria venda que nunca
    // dependeu do Mercado Pago.
    if (!settledOffPlatform) {
      this.mercadoPagoService.verifySellerLinked(restaurant.user);
    }

    // No delivery o gate é híbrido: quem fatura por comissão por pedido não
    // precisa de assinatura, é a mesma regra que o cadastro do restaurante já
    // aplicava. O que muda é o momento — agora vale a cada pedido, não só no
    // dia em que o restaurante foi cadastrado.
    await this.subscriptionGuard.assertProviderCanSell(restaurant.userId, {
      allowCommissionBilling: true,
    });

    const menuItemIds = payload.items.map((item) => item.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId: restaurant.id, isActive: true },
      select: {
        id: true,
        price: true,
        additions: { select: { id: true, price: true, isActive: true } },
      },
    });
    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    let itemsValue = new Prisma.Decimal(0);
    const itemsData: Prisma.FoodOrderItemCreateWithoutFoodOrderInput[] = [];

    for (const orderItem of payload.items) {
      const menuItem = menuItemMap.get(orderItem.menuItemId);
      if (!menuItem) throw new FoodOrderMenuItemNotFoundException();

      const additionIds = orderItem.additionIds ?? [];
      const additions = menuItem.additions.filter(
        (addition) => additionIds.includes(addition.id) && addition.isActive,
      );
      if (additions.length !== additionIds.length) throw new FoodOrderMenuItemNotFoundException();

      const additionsTotal = additions.reduce(
        (sum, addition) => sum.plus(addition.price),
        new Prisma.Decimal(0),
      );
      const unitPrice = menuItem.price.plus(additionsTotal);
      itemsValue = itemsValue.plus(unitPrice.times(orderItem.quantity));

      itemsData.push({
        menuItem: { connect: { id: orderItem.menuItemId } },
        quantity: orderItem.quantity,
        unitPrice,
        notes: orderItem.notes?.trim() || null,
        additions: {
          create: additions.map((addition) => ({
            price: addition.price,
            menuItemAddition: { connect: { id: addition.id } },
          })),
        },
      });
    }

    // O endereço do pedido é resolvido antes do frete: é dele que sai a
    // distância. Endereço informado no pedido é gravado como registro próprio e
    // não toca no cadastro do cliente.
    const deliveryAddressId = payload.deliveryAddress
      ? (await this.createDeliveryAddress(payload.deliveryAddress)).id
      : (user.addressId as number);

    // A taxa é calculada aqui, não recebida. O valor que o cliente enviasse
    // viraria, integralmente, o repasse do entregador.
    const deliveryFee = await this.calculateDeliveryFee(
      deliveryAddressId,
      restaurant.address,
      itemsValue,
    );
    // A gorjeta entra no total cobrado, mas NÃO na base da comissão: ela é
    // dinheiro do entregador, não receita da venda do restaurante.
    const tip = new Prisma.Decimal(payload.tip ?? 0);

    const owner = await this.prisma.user.findUnique({
      where: { id: restaurant.userId },
      // `deliveryCommissionRate`, não `commissionRate`: o segundo é a comissão
      // do influenciador sobre indicações, e usá-lo aqui fazia quem era as duas
      // coisas ter a taxa de indicação cobrada nos próprios pedidos.
      select: { billingType: true, deliveryCommissionRate: true },
    });

    let platformFeeRate: Prisma.Decimal | undefined;
    let commissionAmount: Prisma.Decimal | undefined;
    const rate = resolveCommissionRate(owner);

    if (rate !== null) {
      platformFeeRate = new Prisma.Decimal(rate);
      commissionAmount = calculateCommission(itemsValue, rate);
    }

    // O cupom entra depois da comissão porque é dela que o desconto sai: a
    // plataforma custeia abatendo da própria retenção no split.
    let discount = new Prisma.Decimal(0);
    let couponId: number | undefined;

    if (payload.couponCode) {
      const resolvido = await this.couponsService.resolveForOrder({
        code: payload.couponCode,
        user,
        restaurantId: restaurant.id,
        itemsValue,
        deliveryFee,
        commissionAmount: commissionAmount ?? null,
      });

      discount = resolvido.discount;
      couponId = resolvido.coupon.id;
    }

    const totalValue = itemsValue.plus(deliveryFee).plus(tip).minus(discount);

    const defaultMessage = `Pedido realizado no restaurante "${restaurant.name}".`;

    const foodOrder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.foodOrder.create({
        data: {
          status: FoodOrderStatusEnum.Received,
          itemsValue,
          deliveryFee,
          tip,
          discount,
          couponId,
          totalValue,
          platformFeeRate,
          commissionAmount,
          paymentMethod: payload.paymentMethod,
          settledOffPlatform,
          scheduledFor,
          notes: payload.notes?.trim() || null,
          restaurantId: restaurant.id,
          customerId: user.id,
          addressId: deliveryAddressId,
          items: { create: itemsData },
        },
        select: { id: true },
      });

      // O resgate nasce junto com o pedido: é ele que conta uso do cupom, e
      // gravá-lo fora da transação abriria janela para o mesmo cliente estourar
      // o limite com dois pedidos simultâneos.
      if (couponId) {
        await tx.couponRedemption.create({
          data: {
            couponId,
            userId: user.id,
            foodOrderId: created.id,
            discountAmount: discount,
          },
        });
      }

      await tx.chatRoom.create({
        data: {
          contextType: ChatContextType.FoodOrder,
          referenceId: created.id,
          createdById: user.id,
          lastMessageAt: new Date(),
          participants: { create: [{ userId: user.id }, { userId: restaurant.userId }] },
          messages: {
            create: { senderId: user.id, message: payload.notes?.trim() || defaultMessage },
          },
        },
      });

      return created;
    });

    return {
      message: 'Pedido realizado com sucesso.',
      foodOrder: await this.findById(user, foodOrder.id),
    };
  }

  async findAll(user: User, query: QueryFoodOrderDto): Promise<ResponseFindAllFoodOrderDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const where: Prisma.FoodOrderWhereInput = {
      ...(restaurant ? { restaurantId: restaurant.id } : { customerId: user.id }),
      ...(query.status && { status: query.status }),
    };

    const [foodOrders, totalRecords] = await Promise.all([
      this.prisma.foodOrder.findMany({
        where,
        select: this.foodOrderSelect,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this.prisma.foodOrder.count({ where }),
    ]);

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        contextType: ChatContextType.FoodOrder,
        referenceId: { in: foodOrders.map((foodOrder) => foodOrder.id) },
      },
      select: { id: true, referenceId: true },
    });
    const roomMap = new Map(rooms.map((room) => [room.referenceId, room.id]));

    return {
      foodOrders: foodOrders.map((foodOrder) =>
        this.toResponseDto(foodOrder, roomMap.get(foodOrder.id) || 0),
      ),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(user: User, id: number): Promise<ResponseFoodOrderDto> {
    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id },
      select: this.foodOrderSelect,
    });
    if (!foodOrder) throw new FoodOrderNotFoundException();
    if (foodOrder.customer.id !== user.id && foodOrder.restaurant.userId !== user.id) {
      throw new FoodOrderAccessDeniedException();
    }

    return this.buildResponse(id);
  }

  /**
   * Monta a resposta do pedido, sem checar acesso.
   *
   * Existe porque quem já validou o acesso por outro critério não pode ser
   * obrigado a passar pelo critério do `findById`. Foi o caso da confirmação de
   * pagamento em dinheiro: o entregador tem direito de confirmar, mas não
   * consta como cliente nem como dono do restaurante — a gravação funcionava e
   * a montagem da resposta estourava `403` logo depois, fazendo o app mostrar
   * erro numa operação que tinha dado certo.
   *
   * Privado de propósito: quem chama é responsável por ter autorizado antes.
   */
  private async buildResponse(id: number): Promise<ResponseFoodOrderDto> {
    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id },
      select: this.foodOrderSelect,
    });

    if (!foodOrder) throw new FoodOrderNotFoundException();

    const room = await this.prisma.chatRoom.findUnique({
      where: {
        contextType_referenceId: { contextType: ChatContextType.FoodOrder, referenceId: id },
      },
      select: { id: true },
    });

    return this.toResponseDto(foodOrder, room?.id || 0);
  }

  async respond(
    user: User,
    id: number,
    payload: RespondFoodOrderDto,
  ): Promise<ResponseFoodOrderDto> {
    const foodOrder = await this.findRawById(id);
    if (foodOrder.restaurant.userId !== user.id) throw new FoodOrderAccessDeniedException();
    if (foodOrder.status !== FoodOrderStatusEnum.Received) {
      throw new FoodOrderInvalidStatusException('Somente pedidos recebidos podem ser respondidos.');
    }

    if (payload.status === FoodOrderStatusEnum.Accepted) {
      await this.prisma.$transaction([
        this.prisma.foodOrder.update({
          where: { id },
          data: { status: FoodOrderStatusEnum.Accepted, acceptedAt: new Date() },
        }),
        this.prisma.deliveryAssignment.create({
          data: { foodOrderId: id },
        }),
      ]);
    } else {
      await this.prisma.foodOrder.update({
        where: { id },
        data: { status: FoodOrderStatusEnum.Cancelled, cancelledAt: new Date() },
      });
    }

    void this.notificationsService.notifyUser(
      foodOrder.customerId,
      payload.status === FoodOrderStatusEnum.Accepted
        ? `Olá! Seu pedido #${foodOrder.id} foi aceito pelo restaurante e já está sendo preparado.`
        : `Olá! Seu pedido #${foodOrder.id} foi recusado pelo restaurante.`,
    );

    return this.findById(user, id);
  }

  async markPreparing(user: User, id: number): Promise<ResponseFoodOrderDto> {
    const foodOrder = await this.findRawById(id);
    if (foodOrder.restaurant.userId !== user.id) throw new FoodOrderAccessDeniedException();
    if (foodOrder.status !== FoodOrderStatusEnum.Accepted) {
      throw new FoodOrderInvalidStatusException('Somente pedidos aceitos podem entrar em preparo.');
    }

    await this.prisma.foodOrder.update({
      where: { id },
      data: { status: FoodOrderStatusEnum.Preparing },
    });

    return this.findById(user, id);
  }

  async cancel(user: User, id: number, payload: CancelFoodOrderDto): Promise<ResponseFoodOrderDto> {
    const foodOrder = await this.findRawById(id);
    if (foodOrder.customerId !== user.id && foodOrder.restaurant.userId !== user.id) {
      throw new FoodOrderAccessDeniedException();
    }
    if (
      foodOrder.status !== FoodOrderStatusEnum.Received &&
      foodOrder.status !== FoodOrderStatusEnum.Accepted &&
      foodOrder.status !== FoodOrderStatusEnum.Preparing
    ) {
      throw new FoodOrderInvalidStatusException('Este pedido não pode mais ser cancelado.');
    }

    await this.prisma.foodOrder.update({
      where: { id },
      data: {
        status: FoodOrderStatusEnum.Cancelled,
        cancelledAt: new Date(),
        cancelReason: payload.cancelReason?.trim() || null,
      },
    });

    void this.notificationsService.notifyUser(
      user.id === foodOrder.customerId ? foodOrder.restaurant.userId : foodOrder.customerId,
      `Olá! O pedido #${foodOrder.id} foi cancelado.`,
    );

    return this.findById(user, id);
  }

  /**
   * Confirma que o dinheiro do pedido foi recebido em mãos.
   *
   * Só vale para `Cash`. Cartão, Pix e boleto são quitados pelo provedor de
   * pagamento — permitir a marcação manual neles abriria caminho para dar um
   * pedido como pago sem que o valor tivesse entrado.
   *
   * Quem confirma é quem entrega: o entregador designado ou, quando não há
   * entrega atribuída (retirada no balcão), o dono do restaurante. O cliente
   * não confirma o próprio pagamento, pelo motivo óbvio.
   */
  /**
   * Gera o checkout do Mercado Pago para um pedido que não é em dinheiro.
   *
   * Existe porque a Fase C entregou o pedido com `paymentMethod`, mas sem
   * caminho de cobrança: `PaymentReferenceTypeEnum.FoodOrder` já existia no
   * enum e nenhum `Payment` era criado com ele. Na prática, todo pedido em
   * cartão ou Pix nascia `Pending` e não havia como sair de lá — nem pelo
   * app, nem pelo webhook, que não tinha ramo para esse tipo.
   *
   * Espelha o `pay` de trabalho: preferência na conta do vendedor, split na
   * origem e `Payment` local `Pending` amarrado por `externalReference`. Quem
   * confirma é o webhook, nunca esta rota.
   */
  async pay(user: User, id: number, payload: PayFoodOrderDto): Promise<PayFoodOrderResponseDto> {
    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        settledOffPlatform: true,
        totalValue: true,
        itemsValue: true,
        deliveryFee: true,
        tip: true,
        discount: true,
        commissionAmount: true,
        customerId: true,
        restaurant: {
          select: {
            name: true,
            userId: true,
            user: { select: { mpUserId: true, mpAccessToken: true } },
          },
        },
      },
    });

    if (!foodOrder) throw new FoodOrderNotFoundException();

    // Só o cliente paga. O restaurante não gera cobrança em nome de quem pediu.
    if (foodOrder.customerId !== user.id) throw new FoodOrderAccessDeniedException();

    // Vale para dinheiro e para o cartão cobrado na maquininha do próprio
    // estabelecimento: nos dois casos o dinheiro não passa pela plataforma, e
    // gerar checkout aqui criaria uma segunda cobrança do mesmo pedido.
    if (foodOrder.settledOffPlatform) {
      throw new FoodOrderCheckoutNotAvailableException(
        foodOrder.paymentMethod === PaymentMethodEnum.Cash
          ? 'Pedidos em dinheiro são liquidados na entrega e não geram checkout. ' +
            'A confirmação é feita pelo entregador ou pelo restaurante.'
          : 'Este estabelecimento cobra no cartão pela maquininha dele, na entrega. ' +
            'O pedido não gera checkout online, e a confirmação é feita pelo ' +
            'entregador ou pelo restaurante.',
      );
    }

    if (foodOrder.status === FoodOrderStatusEnum.Cancelled) {
      throw new FoodOrderInvalidStatusException(
        'Este pedido foi cancelado e não pode receber pagamento.',
      );
    }

    if (foodOrder.paymentStatus === PaymentStatusEnum.Paid) {
      throw new FoodOrderCheckoutNotAvailableException('Este pedido já está pago.');
    }

    // Um checkout em aberto não pode ser substituído: as duas preferências
    // continuariam válidas no Mercado Pago e o cliente poderia pagar as duas.
    // Um pagamento recusado é marcado como `Cancelled` pelo webhook, e é isso
    // que libera gerar outro.
    const emAberto = await this.prisma.payment.findFirst({
      where: {
        referenceType: PaymentReferenceTypeEnum.FoodOrder,
        referenceId: foodOrder.id,
        status: { in: [PaymentStatusEnum.Pending, PaymentStatusEnum.Paid] },
      },
      select: { id: true },
    });

    if (emAberto) {
      throw new FoodOrderCheckoutNotAvailableException(
        'Já existe um checkout em aberto para este pedido. ' +
          'Conclua ou aguarde o vencimento antes de gerar outro.',
      );
    }

    // Revalida o vínculo: o dono pode ter desvinculado a conta depois que o
    // pedido entrou. Sem isso, a preferência cairia na conta da plataforma e o
    // restaurante não receberia.
    this.mercadoPagoService.verifySellerLinked(foodOrder.restaurant.user);

    const externalReference = randomUUID();
    const sellerAccessToken = await this.mercadoPagoAccounts.accessTokenFor(
      foodOrder.restaurant.userId,
    );

    // A comissão é a que o próprio pedido gravou na criação — calculada sobre o
    // valor dos ITENS, derivada do `billingType` do dono. Antes o checkout
    // mandava só o percentual e o Mercado Pago o aplicava sobre o total, de
    // modo que a plataforma cobrava comissão também sobre o frete e o número
    // divergia do `commissionAmount` guardado no pedido.
    const comissao = foodOrder.commissionAmount ? Number(foodOrder.commissionAmount) : 0;
    const frete = Number(foodOrder.deliveryFee);
    const gorjeta = Number(foodOrder.tip);

    // A plataforma retém comissão MAIS frete MAIS gorjeta. Frete e gorjeta são
    // do entregador e é a plataforma quem os repassa; deixá-los entrar na conta
    // do restaurante criava repasse que existia no razão e não no banco.
    const desconto = Number(foodOrder.discount);

    // O desconto do cupom é custeado pela plataforma: sai da retenção dela, não
    // do que o restaurante ou o entregador recebem. Por isso a criação do
    // pedido garante que ele nunca passe da comissão — aqui a subtração é
    // segura.
    const retencaoDaPlataforma = comissao + frete + gorjeta - desconto;

    const { preferenceId, checkoutUrl } = await this.mercadoPagoService.createPreference({
      title: `Pedido #${foodOrder.id} - ${foodOrder.restaurant.name}`,
      unitPrice: Number(foodOrder.totalValue),
      externalReference,
      payerEmail: payload.payerEmail,
      sellerAccessToken: sellerAccessToken ?? undefined,
      marketplaceFeeAmount: retencaoDaPlataforma,
    });

    await this.prisma.payment.create({
      data: {
        status: PaymentStatusEnum.Pending,
        method: foodOrder.paymentMethod,
        referenceType: PaymentReferenceTypeEnum.FoodOrder,
        referenceId: foodOrder.id,
        amount: foodOrder.totalValue,
        payerId: foodOrder.customerId,
        receiverId: foodOrder.restaurant.userId,
        externalReference,
        mpPreferenceId: preferenceId,
        // Guarda a COMISSÃO, não a retenção inteira. É ela que vira débito do
        // restaurante no razão; incluir o frete aqui o penalizaria duas vezes,
        // já que ele também não é creditado pelo frete. A retenção total é
        // sempre reconstruível somando o `deliveryFee` do pedido.
        platformFeeAmount: comissao > 0 ? comissao : null,
      },
    });

    return {
      message: 'Checkout de pagamento gerado com sucesso.',
      checkoutUrl,
      foodOrder: await this.buildResponse(id),
    };
  }

  async confirmCashPayment(user: User, id: number): Promise<ResponseFoodOrderDto> {
    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        settledOffPlatform: true,
        customerId: true,
        restaurant: { select: { userId: true } },
        deliveryAssignment: { select: { courierId: true } },
      },
    });

    if (!foodOrder) throw new FoodOrderNotFoundException();

    const isCourier =
      !!foodOrder.deliveryAssignment?.courierId &&
      foodOrder.deliveryAssignment.courierId === user.id;
    const isRestaurantOwner = foodOrder.restaurant.userId === user.id;

    if (!isCourier && !isRestaurantOwner) throw new FoodOrderAccessDeniedException();

    // Confirmação manual é para o que a plataforma não vê entrar: dinheiro em
    // mãos e cartão na maquininha do estabelecimento. O que passa pelo gateway
    // continua sendo quitado pelo webhook, e confirmar à mão abriria caminho
    // para marcar como pago um pedido que ninguém pagou.
    if (!foodOrder.settledOffPlatform) {
      throw new FoodOrderPaymentNotConfirmableException(
        'Só pedidos liquidados fora da plataforma precisam de confirmação manual: ' +
          'dinheiro, ou cartão na maquininha do próprio estabelecimento. ' +
          'Os demais meios são quitados pelo provedor de pagamento.',
      );
    }

    if (foodOrder.status === FoodOrderStatusEnum.Cancelled) {
      throw new FoodOrderInvalidStatusException(
        'Este pedido foi cancelado e não pode ser marcado como pago.',
      );
    }

    // Idempotente: um duplo toque no botão do app não deve virar erro na tela.
    if (foodOrder.paymentStatus === PaymentStatusEnum.Paid) {
      return this.buildResponse(id);
    }

    await this.prisma.foodOrder.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatusEnum.Paid,
        paidAt: new Date(),
        // Fica registrado quem confirmou: em dinheiro, é a única trilha de
        // auditoria que existe se o valor não bater no acerto.
        paidConfirmedById: user.id,
      },
    });

    void this.notificationsService.notifyUser(
      foodOrder.customerId,
      `Olá! O pagamento do pedido #${foodOrder.id} foi confirmado.`,
    );

    return this.buildResponse(id);
  }

  /**
   * Calcula a taxa de entrega a partir da distância entre restaurante e cliente.
   *
   * A faixa aplicável vem de `DeliveryFeeRule`, mantida pelo admin: a primeira
   * cujo intervalo contém a distância medida. `Fixed` cobra o valor em reais;
   * `Percent` cobra o percentual sobre o valor dos itens — nunca sobre o total,
   * o que seria a taxa incidindo sobre ela mesma.
   *
   * Quando falta coordenada em qualquer uma das pontas — endereço cadastrado
   * antes desta mudança, ou front que ainda não geocodifica — cai na faixa que
   * começa em zero, e na falta dela no padrão do código. Degradar assim é
   * melhor que recusar o pedido: o cliente não tem como resolver a ausência de
   * uma coordenada que nem sabe que existe.
   */
  /**
   * Grava o endereço informado no pedido como registro próprio.
   *
   * Uma linha nova por pedido, de propósito: o endereço precisa ficar
   * congelado como estava no momento da entrega. Reaproveitar o registro do
   * cadastro faria uma edição de perfil reescrever para onde pedidos antigos
   * foram entregues.
   */
  /**
   * Converte e valida o horário pedido.
   *
   * A checagem de "no futuro" fica aqui porque `@IsDateString` valida só o
   * formato: uma data bem formada e no passado passaria pela validação e
   * produziria um pedido agendado para ontem.
   */
  private parseSchedule(scheduledFor?: string): Date | undefined {
    if (!scheduledFor) return undefined;

    const quando = new Date(scheduledFor);

    if (Number.isNaN(quando.getTime()) || quando.getTime() <= Date.now()) {
      throw new FoodOrderInvalidScheduleException();
    }

    return quando;
  }

  private async createDeliveryAddress(address: DeliveryAddressDto): Promise<{ id: number }> {
    return this.prisma.address.create({
      data: {
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        latitude: address.latitude,
        longitude: address.longitude,
      },
      select: { id: true },
    });
  }

  private async calculateDeliveryFee(
    customerAddressId: number,
    restaurantAddress: { latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null } | null,
    itemsValue: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const customerAddress = await this.prisma.address.findUnique({
      where: { id: customerAddressId },
      select: { latitude: true, longitude: true },
    });

    const hasCoordinates =
      restaurantAddress?.latitude != null &&
      restaurantAddress?.longitude != null &&
      customerAddress?.latitude != null &&
      customerAddress?.longitude != null;

    const distance = hasCoordinates
      ? distanceInKm(
          {
            latitude: restaurantAddress.latitude.toNumber(),
            longitude: restaurantAddress.longitude.toNumber(),
          },
          {
            latitude: customerAddress.latitude.toNumber(),
            longitude: customerAddress.longitude.toNumber(),
          },
        )
      : 0;

    const rule = await this.prisma.deliveryFeeRule.findFirst({
      where: {
        isActive: true,
        minKm: { lte: distance },
        OR: [{ maxKm: null }, { maxKm: { gt: distance } }],
      },
      // Maior `minKm` primeiro: com faixas 0-3 e 3-10, uma entrega de 5 km
      // casa nas duas condições e a correta é a mais específica.
      orderBy: { minKm: 'desc' },
      select: { type: true, value: true },
    });

    if (!rule) return new Prisma.Decimal(DEFAULT_DELIVERY_FEE);

    if (rule.type === DeliveryFeeTypeEnum.Percent) {
      return new Prisma.Decimal(
        itemsValue.times(rule.value).dividedBy(100).toFixed(2, Prisma.Decimal.ROUND_HALF_UP),
      );
    }

    return rule.value;
  }

  private async findRawById(id: number) {
    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        customerId: true,
        restaurant: { select: { userId: true } },
      },
    });
    if (!foodOrder) throw new FoodOrderNotFoundException();
    return foodOrder;
  }

  private toResponseDto(foodOrder: any, chatRoomId: number): ResponseFoodOrderDto {
    return {
      id: foodOrder.id,
      status: foodOrder.status,
      itemsValue: foodOrder.itemsValue.toFixed(2),
      deliveryFee: foodOrder.deliveryFee.toFixed(2),
      tip: foodOrder.tip.toFixed(2),
      discount: foodOrder.discount.toFixed(2),
      totalValue: foodOrder.totalValue.toFixed(2),
      platformFeeRate: foodOrder.platformFeeRate?.toFixed(2) ?? undefined,
      commissionAmount: foodOrder.commissionAmount?.toFixed(2) ?? undefined,
      paymentMethod: foodOrder.paymentMethod,
      paymentStatus: foodOrder.paymentStatus,
      scheduledFor: foodOrder.scheduledFor ?? undefined,
      paidAt: foodOrder.paidAt ?? undefined,
      notes: foodOrder.notes ?? undefined,
      cancelReason: foodOrder.cancelReason ?? undefined,
      deliveryAddress: foodOrder.address
        ? {
            id: foodOrder.address.id,
            street: foodOrder.address.street ?? undefined,
            number: foodOrder.address.number ?? undefined,
            neighborhood: foodOrder.address.neighborhood ?? undefined,
            city: foodOrder.address.city ?? undefined,
            state: foodOrder.address.state ?? undefined,
            zipCode: foodOrder.address.zipCode ?? undefined,
            latitude: foodOrder.address.latitude?.toString(),
            longitude: foodOrder.address.longitude?.toString(),
          }
        : undefined,
      chatRoomId,
      restaurant: {
        id: foodOrder.restaurant.id,
        name: foodOrder.restaurant.name,
        imageUrl: foodOrder.restaurant.imageUrl ?? undefined,
        userId: foodOrder.restaurant.userId,
      },
      customer: {
        id: foodOrder.customer.id,
        name: foodOrder.customer.name,
        fileUrl: foodOrder.customer.fileUrl ?? undefined,
      },
      items: foodOrder.items.map((item: any) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        notes: item.notes ?? undefined,
        additions: item.additions.map((addition: any) => ({
          id: addition.menuItemAddition.id,
          name: addition.menuItemAddition.name,
          price: addition.menuItemAddition.price.toFixed(2),
        })),
      })),
      delivery: foodOrder.deliveryAssignment
        ? {
            id: foodOrder.deliveryAssignment.id,
            status: foodOrder.deliveryAssignment.status,
            courierId: foodOrder.deliveryAssignment.courierId ?? undefined,
            currentLat: foodOrder.deliveryAssignment.currentLat?.toString() ?? undefined,
            currentLng: foodOrder.deliveryAssignment.currentLng?.toString() ?? undefined,
            locationUpdatedAt: foodOrder.deliveryAssignment.locationUpdatedAt ?? undefined,
          }
        : undefined,
      acceptedAt: foodOrder.acceptedAt ?? undefined,
      cancelledAt: foodOrder.cancelledAt ?? undefined,
      deliveredAt: foodOrder.deliveredAt ?? undefined,
      createdAt: foodOrder.createdAt,
      updatedAt: foodOrder.updatedAt,
    };
  }
}
