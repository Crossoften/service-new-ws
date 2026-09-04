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
import { RespondFoodOrderDto } from './dto/respond-food-order.dto';
import { CancelFoodOrderDto } from './dto/cancel-food-order.dto';
import { QueryFoodOrderDto } from './dto/query-food-order.dto';
import {
  CreateFoodOrderResponseDto,
  ResponseFindAllFoodOrderDto,
  ResponseFoodOrderDto,
} from './dto/response-food-order.dto';
import { FoodOrderPaymentNotConfirmableException } from './exceptions/food-order-payment-not-confirmable.exception';
import { FoodOrderNotFoundException } from './exceptions/food-order-not-found.exception';
import { FoodOrderAccessDeniedException } from './exceptions/food-order-access-denied.exception';
import { FoodOrderInvalidStatusException } from './exceptions/food-order-invalid-status.exception';
import { RestaurantClosedException } from './exceptions/restaurant-closed.exception';
import { FoodOrderRestaurantNotFoundException } from './exceptions/food-order-restaurant-not-found.exception';
import { FoodOrderMenuItemNotFoundException } from './exceptions/food-order-menu-item-not-found.exception';
import { FoodOrderAddressRequiredException } from './exceptions/food-order-address-required.exception';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { distanceInKm } from '@utils/haversine';

const DEFAULT_DELIVERY_FEE = 8;
const DEFAULT_COMMISSION_RATE = 20;

@Injectable()
export class FoodOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  private readonly foodOrderSelect = Prisma.validator<Prisma.FoodOrderSelect>()({
    id: true,
    status: true,
    itemsValue: true,
    deliveryFee: true,
    totalValue: true,
    platformFeeRate: true,
    commissionAmount: true,
    paymentMethod: true,
    paymentStatus: true,
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
    if (!user.addressId) throw new FoodOrderAddressRequiredException();

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: payload.restaurantId },
      select: {
        id: true,
        isActive: true,
        isOpen: true,
        userId: true,
        name: true,
        address: { select: { latitude: true, longitude: true } },
        user: { select: { mpUserId: true, mpAccessToken: true } },
      },
    });
    if (!restaurant || !restaurant.isActive) throw new FoodOrderRestaurantNotFoundException();
    if (!restaurant.isOpen) throw new RestaurantClosedException();

    // A exigência de conta vinculada vale só para o que passa pelo gateway.
    // Pedido em dinheiro é liquidado na entrega, em mãos — bloqueá-lo por falta
    // de vínculo derrubaria venda que nunca dependeu do Mercado Pago.
    if (payload.paymentMethod !== PaymentMethodEnum.Cash) {
      this.mercadoPagoService.verifySellerLinked(restaurant.user);
    }

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

    // A taxa é calculada aqui, não recebida. O valor que o cliente enviasse
    // viraria, integralmente, o repasse do entregador.
    const deliveryFee = await this.calculateDeliveryFee(
      user.addressId,
      restaurant.address,
      itemsValue,
    );
    const totalValue = itemsValue.plus(deliveryFee);

    const owner = await this.prisma.user.findUnique({
      where: { id: restaurant.userId },
      select: { billingType: true, commissionRate: true },
    });

    let platformFeeRate: Prisma.Decimal | undefined;
    let commissionAmount: Prisma.Decimal | undefined;
    if (owner?.billingType === 'Commission') {
      const rate = owner.commissionRate ? owner.commissionRate.toNumber() : DEFAULT_COMMISSION_RATE;
      platformFeeRate = new Prisma.Decimal(rate);
      commissionAmount = new Prisma.Decimal((itemsValue.toNumber() * (rate / 100)).toFixed(2));
    }

    const defaultMessage = `Pedido realizado no restaurante "${restaurant.name}".`;

    const foodOrder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.foodOrder.create({
        data: {
          status: FoodOrderStatusEnum.Received,
          itemsValue,
          deliveryFee,
          totalValue,
          platformFeeRate,
          commissionAmount,
          paymentMethod: payload.paymentMethod,
          notes: payload.notes?.trim() || null,
          restaurantId: restaurant.id,
          customerId: user.id,
          addressId: user.addressId,
          items: { create: itemsData },
        },
        select: { id: true },
      });

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

    void this.whatsappService.notifyUser(
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

    void this.whatsappService.notifyUser(
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
  async confirmCashPayment(user: User, id: number): Promise<ResponseFoodOrderDto> {
    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
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

    if (foodOrder.paymentMethod !== PaymentMethodEnum.Cash) {
      throw new FoodOrderPaymentNotConfirmableException(
        'Só pedidos pagos em dinheiro precisam de confirmação manual. ' +
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

    void this.whatsappService.notifyUser(
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
      totalValue: foodOrder.totalValue.toFixed(2),
      platformFeeRate: foodOrder.platformFeeRate?.toFixed(2) ?? undefined,
      commissionAmount: foodOrder.commissionAmount?.toFixed(2) ?? undefined,
      paymentMethod: foodOrder.paymentMethod,
      paymentStatus: foodOrder.paymentStatus,
      paidAt: foodOrder.paidAt ?? undefined,
      notes: foodOrder.notes ?? undefined,
      cancelReason: foodOrder.cancelReason ?? undefined,
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
