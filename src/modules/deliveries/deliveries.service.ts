import { PrismaService } from '@database/PrismaService';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  DeliveryAssignmentStatusEnum,
  FinancialTransactionCategoryEnum,
  FinancialTransactionTypeEnum,
  FoodOrderStatusEnum,
  PaymentReferenceTypeEnum,
  Prisma,
  User,
} from '@prisma/client';
import { DeliveriesGateway } from './deliveries.gateway';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { ResponseDeliveryDto, ResponseFindAllDeliveryDto } from './dto/response-delivery.dto';
import { DeliveryNotFoundException } from './exceptions/delivery-not-found.exception';
import { DeliveryAccessDeniedException } from './exceptions/delivery-access-denied.exception';
import { DeliveryInvalidStatusException } from './exceptions/delivery-invalid-status.exception';
import { DeliveryAlreadyTakenException } from './exceptions/delivery-already-taken.exception';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DeliveriesGateway))
    private readonly deliveriesGateway: DeliveriesGateway,
    private readonly whatsappService: WhatsappService,
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

    void this.whatsappService.notifyUser(
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
      select: { id: true, deliveryFee: true, customerId: true },
    });

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.deliveryAssignment.update({
        where: { id },
        data: { status: DeliveryAssignmentStatusEnum.Delivered, deliveredAt: now },
      }),
      this.prisma.foodOrder.update({
        where: { id: delivery.foodOrderId },
        data: { status: FoodOrderStatusEnum.Delivered, deliveredAt: now },
      }),
      this.prisma.financialTransaction.create({
        data: {
          type: FinancialTransactionTypeEnum.Credit,
          category: FinancialTransactionCategoryEnum.DeliveryPayout,
          amount: foodOrder.deliveryFee,
          description: `Repasse pela entrega do pedido #${foodOrder.id}.`,
          availableAt: now,
          referenceType: PaymentReferenceTypeEnum.FoodOrder,
          referenceId: foodOrder.id,
          userId: user.id,
        },
      }),
    ]);

    this.deliveriesGateway.emitStatusChange(id, DeliveryAssignmentStatusEnum.Delivered);

    void this.whatsappService.notifyUser(
      foodOrder.customerId,
      `Olá! Seu pedido #${foodOrder.id} foi entregue. Bom apetite!`,
    );

    return this.findById(user, id);
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
