import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { ChatContextType, Prisma, RentalStatusEnum, User } from '@prisma/client';
import { CreateRentalDto } from './dto/create-rental.dto';
import { RespondRentalDto } from './dto/respond-rental.dto';
import { CancelRentalDto } from './dto/cancel-rental.dto';
import { QueryRentalDto } from './dto/query-rental.dto';
import {
  CreateRentalResponseDto,
  ResponseFindAllRentalDto,
  ResponseRentalDto,
} from './dto/response-rental.dto';
import { RentalAccessDeniedException } from './exceptions/rental-access-denied.exception';
import { RentalInvalidStatusException } from './exceptions/rental-invalid-status.exception';
import { RentalNotFoundException } from './exceptions/rental-not-found.exception';
import { RentalProductNotFoundException } from './exceptions/rental-product-not-found.exception';
import { RentalSelfRequestNotAllowedException } from './exceptions/rental-self-request-not-allowed.exception';

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly rentalSelect = Prisma.validator<Prisma.RentalSelect>()({
    id: true,
    status: true,
    startDate: true,
    endDate: true,
    price: true,
    conditions: true,
    cancelReason: true,
    requesterId: true,
    providerId: true,
    acceptedAt: true,
    rejectedAt: true,
    returnedAt: true,
    cancelledAt: true,
    createdAt: true,
    updatedAt: true,
    product: { select: { id: true, name: true, imageUrl: true } },
    requester: { select: { id: true, name: true, fileUrl: true } },
    provider: { select: { id: true, name: true, fileUrl: true } },
  });

  async create(user: User, payload: CreateRentalDto): Promise<CreateRentalResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: payload.productId },
      select: { id: true, name: true, userId: true, isActive: true },
    });

    if (!product || !product.isActive) {
      throw new RentalProductNotFoundException();
    }

    if (product.userId === user.id) {
      throw new RentalSelfRequestNotAllowedException();
    }

    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);
    if (endDate <= startDate) {
      throw new RentalInvalidStatusException(
        'A data de término deve ser posterior à data de início.',
      );
    }

    const defaultMessage = `Solicitação de aluguel de "${product.name}" no valor de R$ ${payload.price.toFixed(2)}.`;

    const rental = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rental.create({
        data: {
          status: RentalStatusEnum.Requested,
          startDate,
          endDate,
          price: new Prisma.Decimal(payload.price),
          conditions: payload.conditions?.trim() || null,
          productId: product.id,
          requesterId: user.id,
          providerId: product.userId,
        },
        select: { id: true },
      });

      await tx.chatRoom.create({
        data: {
          contextType: ChatContextType.Rental,
          referenceId: created.id,
          createdById: user.id,
          lastMessageAt: new Date(),
          participants: { create: [{ userId: user.id }, { userId: product.userId }] },
          messages: {
            create: {
              senderId: user.id,
              message: payload.conditions?.trim() || defaultMessage,
            },
          },
        },
      });

      return created;
    });

    return {
      message: 'Solicitação de aluguel enviada com sucesso.',
      rental: await this.findById(user, rental.id),
    };
  }

  async findAll(user: User, query: QueryRentalDto): Promise<ResponseFindAllRentalDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const participantFilter: Prisma.RentalWhereInput =
      query.participantRole === 'Requester'
        ? { requesterId: user.id }
        : query.participantRole === 'Provider'
          ? { providerId: user.id }
          : { OR: [{ requesterId: user.id }, { providerId: user.id }] };

    const where: Prisma.RentalWhereInput = {
      ...participantFilter,
      ...(query.status && { status: query.status }),
    };

    const [rentals, totalRecords] = await Promise.all([
      this.prisma.rental.findMany({
        where,
        select: this.rentalSelect,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this.prisma.rental.count({ where }),
    ]);

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        contextType: ChatContextType.Rental,
        referenceId: { in: rentals.map((rental) => rental.id) },
      },
      select: { id: true, referenceId: true },
    });
    const roomMap = new Map(rooms.map((room) => [room.referenceId, room.id]));

    return {
      rentals: rentals.map((rental) => this.toResponseDto(rental, roomMap.get(rental.id) || 0)),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(user: User, id: number): Promise<ResponseRentalDto> {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      select: this.rentalSelect,
    });

    if (!rental) throw new RentalNotFoundException();
    if (rental.requesterId !== user.id && rental.providerId !== user.id) {
      throw new RentalAccessDeniedException();
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { contextType_referenceId: { contextType: ChatContextType.Rental, referenceId: id } },
      select: { id: true },
    });

    return this.toResponseDto(rental, room?.id || 0);
  }

  async respond(user: User, id: number, payload: RespondRentalDto): Promise<ResponseRentalDto> {
    const rental = await this.findRawById(id);

    if (rental.providerId !== user.id) throw new RentalAccessDeniedException();
    if (rental.status !== RentalStatusEnum.Requested) {
      throw new RentalInvalidStatusException(
        'Somente solicitações pendentes podem ser respondidas.',
      );
    }

    const now = new Date();
    await this.prisma.rental.update({
      where: { id },
      data: {
        status: payload.status,
        acceptedAt: payload.status === RentalStatusEnum.Accepted ? now : undefined,
        rejectedAt: payload.status === RentalStatusEnum.Rejected ? now : undefined,
      },
    });

    return this.findById(user, id);
  }

  async start(user: User, id: number): Promise<ResponseRentalDto> {
    const rental = await this.findRawById(id);

    if (rental.providerId !== user.id) throw new RentalAccessDeniedException();
    if (rental.status !== RentalStatusEnum.Accepted) {
      throw new RentalInvalidStatusException('Somente alugueis aceitos podem ser iniciados.');
    }

    await this.prisma.rental.update({
      where: { id },
      data: { status: RentalStatusEnum.Active },
    });

    return this.findById(user, id);
  }

  async return_(user: User, id: number): Promise<ResponseRentalDto> {
    const rental = await this.findRawById(id);

    if (rental.providerId !== user.id) throw new RentalAccessDeniedException();
    if (rental.status !== RentalStatusEnum.Active) {
      throw new RentalInvalidStatusException('Somente alugueis ativos podem ser devolvidos.');
    }

    await this.prisma.rental.update({
      where: { id },
      data: { status: RentalStatusEnum.Returned, returnedAt: new Date() },
    });

    return this.findById(user, id);
  }

  async cancel(user: User, id: number, payload: CancelRentalDto): Promise<ResponseRentalDto> {
    const rental = await this.findRawById(id);

    if (rental.requesterId !== user.id && rental.providerId !== user.id) {
      throw new RentalAccessDeniedException();
    }

    if (
      rental.status !== RentalStatusEnum.Requested &&
      rental.status !== RentalStatusEnum.Accepted &&
      rental.status !== RentalStatusEnum.Active
    ) {
      throw new RentalInvalidStatusException('Este aluguel não pode mais ser cancelado.');
    }

    await this.prisma.rental.update({
      where: { id },
      data: {
        status: RentalStatusEnum.Cancelled,
        cancelledAt: new Date(),
        cancelReason: payload.cancelReason?.trim() || null,
      },
    });

    return this.findById(user, id);
  }

  private async findRawById(id: number) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      select: { id: true, status: true, requesterId: true, providerId: true },
    });
    if (!rental) throw new RentalNotFoundException();
    return rental;
  }

  private toResponseDto(rental: any, chatRoomId: number): ResponseRentalDto {
    return {
      id: rental.id,
      status: rental.status,
      startDate: rental.startDate,
      endDate: rental.endDate,
      price: rental.price.toFixed(2),
      conditions: rental.conditions ?? undefined,
      cancelReason: rental.cancelReason ?? undefined,
      chatRoomId,
      product: rental.product,
      requester: {
        id: rental.requester.id,
        name: rental.requester.name,
        fileUrl: rental.requester.fileUrl ?? undefined,
      },
      provider: {
        id: rental.provider.id,
        name: rental.provider.name,
        fileUrl: rental.provider.fileUrl ?? undefined,
      },
      acceptedAt: rental.acceptedAt ?? undefined,
      rejectedAt: rental.rejectedAt ?? undefined,
      returnedAt: rental.returnedAt ?? undefined,
      cancelledAt: rental.cancelledAt ?? undefined,
      createdAt: rental.createdAt,
      updatedAt: rental.updatedAt,
    };
  }
}
