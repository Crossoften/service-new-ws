import { PrismaService } from '@database/PrismaService';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  DeliveryAssignmentStatusEnum,
  FinancialTransactionCategoryEnum,
  FinancialTransactionTypeEnum,
  FoodOrderStatusEnum,
  PaymentMethodEnum,
  PaymentReferenceTypeEnum,
  Prisma,
  User,
} from '@prisma/client';
import { DeliveriesGateway } from './deliveries.gateway';
import { PaymentStatusEnum } from '../works/enums/payment-status.enum';
import { ResponseDeliveryEarningsDto } from './dto/response-delivery-earnings.dto';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { ResponseDeliveryDto, ResponseFindAllDeliveryDto } from './dto/response-delivery.dto';
import { DeliveryNotFoundException } from './exceptions/delivery-not-found.exception';
import { DeliveryAccessDeniedException } from './exceptions/delivery-access-denied.exception';
import { DeliveryInvalidStatusException } from './exceptions/delivery-invalid-status.exception';
import { DeliveryAlreadyTakenException } from './exceptions/delivery-already-taken.exception';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DeliveriesGateway))
    private readonly deliveriesGateway: DeliveriesGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly deliverySelect = Prisma.validator<Prisma.DeliveryAssignmentSelect>()({
    id: true,
    status: true,
    courierId: true,
    currentLat: true,
    currentLng: true,
    locationUpdatedAt: true,
    acceptedAt: true,
    rejectedAt: true,
    pickedUpAt: true,
    deliveredAt: true,
    cancelledAt: true,
    createdAt: true,
    updatedAt: true,
    foodOrder: {
      select: {
        id: true,
        status: true,
        deliveryFee: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            userId: true,
            address: {
              select: {
                street: true,
                neighborhood: true,
                city: true,
                state: true,
                zipCode: true,
                number: true,
              },
            },
          },
        },
        customer: { select: { id: true, name: true } },
        address: {
          select: {
            street: true,
            neighborhood: true,
            city: true,
            state: true,
            zipCode: true,
            number: true,
          },
        },
      },
    },
  });

  async findAvailable(query: QueryDeliveryDto): Promise<ResponseFindAllDeliveryDto> {
    return this.list({ status: DeliveryAssignmentStatusEnum.Pending, courierId: null }, query);
  }

  async findMine(user: User, query: QueryDeliveryDto): Promise<ResponseFindAllDeliveryDto> {
    return this.list({ courierId: user.id }, query);
  }

  async findById(user: User, id: number): Promise<ResponseDeliveryDto> {
    const delivery = await this.prisma.deliveryAssignment.findUnique({
      where: { id },
      select: this.deliverySelect,
    });
    if (!delivery) throw new DeliveryNotFoundException();
    if (
      delivery.courierId !== user.id &&
      delivery.foodOrder.restaurant.userId !== user.id &&
      delivery.foodOrder.customer.id !== user.id
    ) {
      throw new DeliveryAccessDeniedException();
    }

    return this.toResponseDto(delivery);
  }

  async accept(user: User, id: number): Promise<ResponseDeliveryDto> {
    const delivery = await this.findRawById(id);
    if (delivery.status !== DeliveryAssignmentStatusEnum.Pending || delivery.courierId) {
      throw new DeliveryAlreadyTakenException();
    }

    await this.prisma.deliveryAssignment.update({
      where: { id },
      data: {
        status: DeliveryAssignmentStatusEnum.Accepted,
        courierId: user.id,
        acceptedAt: new Date(),
      },
    });

    this.deliveriesGateway.emitStatusChange(id, DeliveryAssignmentStatusEnum.Accepted);

    return this.findById(user, id);
  }

  async reject(user: User, id: number): Promise<ResponseDeliveryDto> {
    const delivery = await this.findRawById(id);
    if (delivery.courierId !== user.id) throw new DeliveryAccessDeniedException();
    if (delivery.status !== DeliveryAssignmentStatusEnum.Accepted) {
      throw new DeliveryInvalidStatusException('Somente entregas aceitas podem ser recusadas.');
    }

    await this.prisma.deliveryAssignment.update({
      where: { id },
      data: {
        status: DeliveryAssignmentStatusEnum.Pending,
        courierId: null,
        acceptedAt: null,
        rejectedAt: new Date(),
      },
    });

    this.deliveriesGateway.emitStatusChange(id, DeliveryAssignmentStatusEnum.Pending);

    return this.findById(user, id);
  }

  async pickup(user: User, id: number): Promise<ResponseDeliveryDto> {
    const delivery = await this.findRawById(id);
    if (delivery.courierId !== user.id) throw new DeliveryAccessDeniedException();
    if (delivery.status !== DeliveryAssignmentStatusEnum.Accepted) {
      throw new DeliveryInvalidStatusException('Somente entregas aceitas podem ser coletadas.');
    }

    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id: delivery.foodOrderId },
      select: { id: true, customerId: true },
    });

    await this.prisma.$transaction([
      this.prisma.deliveryAssignment.update({
        where: { id },
        data: { status: DeliveryAssignmentStatusEnum.PickedUp, pickedUpAt: new Date() },
      }),
      this.prisma.foodOrder.update({
        where: { id: delivery.foodOrderId },
        data: { status: FoodOrderStatusEnum.OnTheWay },
      }),
    ]);

    this.deliveriesGateway.emitStatusChange(id, DeliveryAssignmentStatusEnum.PickedUp);

    void this.notificationsService.notifyUser(
      foodOrder.customerId,
      `Olá! Seu pedido #${foodOrder.id} saiu para entrega.`,
    );

    return this.findById(user, id);
  }

  async updateLocation(
    user: User,
    id: number,
    payload: UpdateDeliveryLocationDto,
  ): Promise<ResponseDeliveryDto> {
    const delivery = await this.findRawById(id);
    if (delivery.courierId !== user.id) throw new DeliveryAccessDeniedException();
    if (
      delivery.status !== DeliveryAssignmentStatusEnum.PickedUp &&
      delivery.status !== DeliveryAssignmentStatusEnum.OnTheWay
    ) {
      throw new DeliveryInvalidStatusException(
        'A localização só pode ser atualizada após a coleta do pedido.',
      );
    }

    const locationUpdatedAt = new Date();

    await this.prisma.deliveryAssignment.update({
      where: { id },
      data: {
        status: DeliveryAssignmentStatusEnum.OnTheWay,
        currentLat: payload.lat,
        currentLng: payload.lng,
        locationUpdatedAt,
      },
    });

    this.deliveriesGateway.emitLocation(id, {
      lat: payload.lat.toString(),
      lng: payload.lng.toString(),
      updatedAt: locationUpdatedAt,
    });

    return this.findById(user, id);
  }

  async deliver(user: User, id: number): Promise<ResponseDeliveryDto> {
    const delivery = await this.findRawById(id);
    if (delivery.courierId !== user.id) throw new DeliveryAccessDeniedException();
    if (
      delivery.status !== DeliveryAssignmentStatusEnum.PickedUp &&
      delivery.status !== DeliveryAssignmentStatusEnum.OnTheWay
    ) {
      throw new DeliveryInvalidStatusException(
        'Esta entrega não pode ser finalizada neste status.',
      );
    }

    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id: delivery.foodOrderId },
      select: {
        id: true,
        deliveryFee: true,
        tip: true,
        customerId: true,
        paymentMethod: true,
        settledOffPlatform: true,
      },
    });

    const now = new Date();

    // Pedido liquidado fora da plataforma não gera repasse.
    //
    // O repasse existe porque a plataforma reteve frete e gorjeta no split e
    // deve esses valores ao entregador. Quando o pedido é pago em dinheiro, ou
    // no cartão pela maquininha do próprio estabelecimento, nada disso
    // aconteceu: a plataforma não viu esse dinheiro entrar. Creditar mesmo
    // assim criava passivo de dinheiro que nunca chegou — e o entregador
    // receberia duas vezes assim que o repasse passasse a ser pago de verdade.
    //
    // No caso da maquininha, quem deve ao entregador é o estabelecimento, que
    // aceitou essa responsabilidade ao ligar a modalidade.
    const plataformaRecebeu = !foodOrder.settledOffPlatform;

    const operacoes: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.deliveryAssignment.update({
        where: { id },
        data: { status: DeliveryAssignmentStatusEnum.Delivered, deliveredAt: now },
      }),
      this.prisma.foodOrder.update({
        where: { id: delivery.foodOrderId },
        data: { status: FoodOrderStatusEnum.Delivered, deliveredAt: now },
      }),
    ];

    if (plataformaRecebeu) {
      operacoes.push(
        this.prisma.financialTransaction.create({
          data: {
            type: FinancialTransactionTypeEnum.Credit,
            category: FinancialTransactionCategoryEnum.DeliveryPayout,
            // Frete mais gorjeta: os dois foram retidos pela plataforma no
            // split e são repassados juntos. A gorjeta não sofre comissão.
            amount: foodOrder.deliveryFee.plus(foodOrder.tip),
            description: foodOrder.tip.greaterThan(0)
              ? `Repasse pela entrega do pedido #${foodOrder.id}, com gorjeta de R$ ${foodOrder.tip.toFixed(2)}.`
              : `Repasse pela entrega do pedido #${foodOrder.id}.`,
            availableAt: now,
            referenceType: PaymentReferenceTypeEnum.FoodOrder,
            referenceId: foodOrder.id,
            userId: user.id,
          },
        }),
      );
    } else {
      this.logger.log(
        foodOrder.paymentMethod === PaymentMethodEnum.Cash
          ? `Pedido #${foodOrder.id} foi pago em dinheiro; o entregador recebeu frete e ` +
              'gorjeta em mãos e não há repasse a creditar.'
          : `Pedido #${foodOrder.id} foi cobrado na maquininha do estabelecimento; ` +
              'o repasse ao entregador é responsabilidade dele.',
      );
    }

    await this.prisma.$transaction(operacoes);

    this.deliveriesGateway.emitStatusChange(id, DeliveryAssignmentStatusEnum.Delivered);

    void this.notificationsService.notifyUser(
      foodOrder.customerId,
      `Olá! Seu pedido #${foodOrder.id} foi entregue. Bom apetite!`,
    );

    return this.findById(user, id);
  }

  /**
   * Ganhos do entregador, por período.
   *
   * A regra de repasse já existia: `deliver()` credita 100% do `deliveryFee` como
   * `FinancialTransaction` na categoria `DeliveryPayout`. Faltava só quem lesse —
   * a Home do entregador exibia faturamento sem endpoint que o fornecesse.
   *
   * Lê da tabela de lançamentos, e não das entregas, para que o valor exibido seja
   * exatamente o que foi creditado: se a regra de repasse mudar amanhã, o histórico
   * já pago continua correto.
   */
  async findMyEarnings(user: User): Promise<ResponseDeliveryEarningsDto> {
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [day, week, month, total, available, paid] = await Promise.all([
      this.aggregatePayouts(user.id, startOfDay),
      this.aggregatePayouts(user.id, startOfWeek),
      this.aggregatePayouts(user.id, startOfMonth),
      this.aggregatePayouts(user.id),
      // "A receber" e "já recebido" não são recortes de tempo, e sim de
      // liquidação: o que separa os dois é o vínculo com um lote de repasse.
      // Os quatro primeiros continuam somando tudo, pago ou não — é o
      // faturamento do entregador, que não muda quando o dinheiro sai.
      this.aggregatePayouts(user.id, undefined, { settled: false }),
      this.aggregatePayouts(user.id, undefined, { settled: true }),
    ]);

    return { day, week, month, total, available, paid };
  }

  private async aggregatePayouts(
    userId: number,
    since?: Date,
    options?: { settled?: boolean },
  ): Promise<{ amount: string; deliveries: number }> {
    const result = await this.prisma.financialTransaction.aggregate({
      where: {
        userId,
        type: FinancialTransactionTypeEnum.Credit,
        category: FinancialTransactionCategoryEnum.DeliveryPayout,
        status: PaymentStatusEnum.Paid,
        ...(since ? { createdAt: { gte: since } } : {}),
        ...(options?.settled === undefined
          ? {}
          : options.settled
            ? { payoutId: { not: null } }
            : { payoutId: null }),
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return {
      amount: (result._sum.amount ? Number(result._sum.amount) : 0).toFixed(2),
      deliveries: result._count._all,
    };
  }

  private async findRawById(id: number) {
    const delivery = await this.prisma.deliveryAssignment.findUnique({
      where: { id },
      select: { id: true, status: true, courierId: true, foodOrderId: true },
    });
    if (!delivery) throw new DeliveryNotFoundException();
    return delivery;
  }

  private async list(
    baseWhere: Prisma.DeliveryAssignmentWhereInput,
    query: QueryDeliveryDto,
  ): Promise<ResponseFindAllDeliveryDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const [deliveries, totalRecords] = await Promise.all([
      this.prisma.deliveryAssignment.findMany({
        where: baseWhere,
        select: this.deliverySelect,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this.prisma.deliveryAssignment.count({ where: baseWhere }),
    ]);

    return {
      deliveries: deliveries.map((delivery) => this.toResponseDto(delivery)),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  private toResponseDto(delivery: any): ResponseDeliveryDto {
    return {
      id: delivery.id,
      status: delivery.status,
      courierId: delivery.courierId ?? undefined,
      currentLat: delivery.currentLat?.toString() ?? undefined,
      currentLng: delivery.currentLng?.toString() ?? undefined,
      locationUpdatedAt: delivery.locationUpdatedAt ?? undefined,
      foodOrder: {
        id: delivery.foodOrder.id,
        status: delivery.foodOrder.status,
        deliveryFee: delivery.foodOrder.deliveryFee.toFixed(2),
        restaurant: {
          id: delivery.foodOrder.restaurant.id,
          name: delivery.foodOrder.restaurant.name,
          address: delivery.foodOrder.restaurant.address ?? undefined,
        },
        customer: { id: delivery.foodOrder.customer.id, name: delivery.foodOrder.customer.name },
        deliveryAddress: delivery.foodOrder.address ?? undefined,
      },
      acceptedAt: delivery.acceptedAt ?? undefined,
      rejectedAt: delivery.rejectedAt ?? undefined,
      pickedUpAt: delivery.pickedUpAt ?? undefined,
      deliveredAt: delivery.deliveredAt ?? undefined,
      cancelledAt: delivery.cancelledAt ?? undefined,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    };
  }
}
