import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { ChatContextType, Prisma, TransportRequestStatusEnum, User } from '@prisma/client';
import { CreateTransportRequestDto } from './dto/create-transport-request.dto';
import { QuoteTransportRequestDto } from './dto/quote-transport-request.dto';
import { RespondTransportRequestDto } from './dto/respond-transport-request.dto';
import { CancelTransportRequestDto } from './dto/cancel-transport-request.dto';
import { QueryTransportRequestDto } from './dto/query-transport-request.dto';
import {
  CreateTransportRequestResponseDto,
  ResponseFindAllTransportRequestDto,
  ResponseTransportRequestDto,
} from './dto/response-transport-request.dto';
import { TransportRequestAccessDeniedException } from './exceptions/transport-request-access-denied.exception';
import { TransportRequestInvalidStatusException } from './exceptions/transport-request-invalid-status.exception';
import { TransportRequestNotFoundException } from './exceptions/transport-request-not-found.exception';
import { TransportationForRequestNotFoundException } from './exceptions/transportation-not-found.exception';
import { TransportRequestSelfNotAllowedException } from './exceptions/transport-request-self-not-allowed.exception';

@Injectable()
export class TransportRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly select = Prisma.validator<Prisma.TransportRequestSelect>()({
    id: true,
    status: true,
    origin: true,
    destination: true,
    cargoDescription: true,
    quotedValue: true,
    cancelReason: true,
    requesterId: true,
    providerId: true,
    quotedAt: true,
    acceptedAt: true,
    rejectedAt: true,
    deliveredAt: true,
    cancelledAt: true,
    createdAt: true,
    updatedAt: true,
    transportation: { select: { id: true, name: true, imageUrl: true } },
    requester: { select: { id: true, name: true, fileUrl: true } },
    provider: { select: { id: true, name: true, fileUrl: true } },
  });

  async create(
    user: User,
    payload: CreateTransportRequestDto,
  ): Promise<CreateTransportRequestResponseDto> {
    const transportation = await this.prisma.transportation.findUnique({
      where: { id: payload.transportationId },
      select: { id: true, name: true, userId: true, isActive: true },
    });

    if (!transportation || !transportation.isActive) {
      throw new TransportationForRequestNotFoundException();
    }

    if (transportation.userId === user.id) {
      throw new TransportRequestSelfNotAllowedException();
    }

    const defaultMessage = `Solicitação de transporte de "${payload.origin.trim()}" para "${payload.destination.trim()}".`;

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.transportRequest.create({
        data: {
          status: TransportRequestStatusEnum.Requested,
          origin: payload.origin.trim(),
          destination: payload.destination.trim(),
          cargoDescription: payload.cargoDescription?.trim() || null,
          transportationId: transportation.id,
          requesterId: user.id,
          providerId: transportation.userId,
        },
        select: { id: true },
      });

      await tx.chatRoom.create({
        data: {
          contextType: ChatContextType.TransportRequest,
          referenceId: request.id,
          createdById: user.id,
          lastMessageAt: new Date(),
          participants: { create: [{ userId: user.id }, { userId: transportation.userId }] },
          messages: {
            create: {
              senderId: user.id,
              message: payload.cargoDescription?.trim() || defaultMessage,
            },
          },
        },
      });

      return request;
    });

    return {
      message: 'Solicitação de transporte enviada com sucesso.',
      transportRequest: await this.findById(user, created.id),
    };
  }

  async findAll(
    user: User,
    query: QueryTransportRequestDto,
  ): Promise<ResponseFindAllTransportRequestDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const participantFilter: Prisma.TransportRequestWhereInput =
      query.participantRole === 'Requester'
        ? { requesterId: user.id }
        : query.participantRole === 'Provider'
          ? { providerId: user.id }
          : { OR: [{ requesterId: user.id }, { providerId: user.id }] };

    const where: Prisma.TransportRequestWhereInput = {
      ...participantFilter,
      ...(query.status && { status: query.status }),
    };

    const [requests, totalRecords] = await Promise.all([
      this.prisma.transportRequest.findMany({
        where,
        select: this.select,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this.prisma.transportRequest.count({ where }),
    ]);

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        contextType: ChatContextType.TransportRequest,
        referenceId: { in: requests.map((r) => r.id) },
      },
      select: { id: true, referenceId: true },
    });
    const roomMap = new Map(rooms.map((room) => [room.referenceId, room.id]));

    return {
      transportRequests: requests.map((r) => this.toResponseDto(r, roomMap.get(r.id) || 0)),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(user: User, id: number): Promise<ResponseTransportRequestDto> {
    const request = await this.prisma.transportRequest.findUnique({
      where: { id },
      select: this.select,
    });

    if (!request) throw new TransportRequestNotFoundException();
    if (request.requesterId !== user.id && request.providerId !== user.id) {
      throw new TransportRequestAccessDeniedException();
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: {
        contextType_referenceId: { contextType: ChatContextType.TransportRequest, referenceId: id },
      },
      select: { id: true },
    });

    return this.toResponseDto(request, room?.id || 0);
  }

  async quote(
    user: User,
    id: number,
    payload: QuoteTransportRequestDto,
  ): Promise<ResponseTransportRequestDto> {
    const request = await this.findRawById(id);

    if (request.providerId !== user.id) throw new TransportRequestAccessDeniedException();
    if (request.status !== TransportRequestStatusEnum.Requested) {
      throw new TransportRequestInvalidStatusException(
        'Somente pedidos pendentes podem receber cotação.',
      );
    }

    await this.prisma.transportRequest.update({
      where: { id },
      data: {
        status: TransportRequestStatusEnum.Quoted,
        quotedValue: new Prisma.Decimal(payload.quotedValue),
        quotedAt: new Date(),
      },
    });

    return this.findById(user, id);
  }

  async respond(
    user: User,
    id: number,
    payload: RespondTransportRequestDto,
  ): Promise<ResponseTransportRequestDto> {
    const request = await this.findRawById(id);

    if (request.requesterId !== user.id) throw new TransportRequestAccessDeniedException();
    if (request.status !== TransportRequestStatusEnum.Quoted) {
      throw new TransportRequestInvalidStatusException(
        'Somente pedidos cotados podem ser respondidos.',
      );
    }

    const now = new Date();
    await this.prisma.transportRequest.update({
      where: { id },
      data: {
        status: payload.status,
        acceptedAt: payload.status === TransportRequestStatusEnum.Accepted ? now : undefined,
        rejectedAt: payload.status === TransportRequestStatusEnum.Rejected ? now : undefined,
      },
    });

    return this.findById(user, id);
  }

  async start(user: User, id: number): Promise<ResponseTransportRequestDto> {
    const request = await this.findRawById(id);

    if (request.providerId !== user.id) throw new TransportRequestAccessDeniedException();
    if (request.status !== TransportRequestStatusEnum.Accepted) {
      throw new TransportRequestInvalidStatusException(
        'Somente pedidos aceitos podem ser iniciados.',
      );
    }

    await this.prisma.transportRequest.update({
      where: { id },
      data: { status: TransportRequestStatusEnum.InTransit },
    });

    return this.findById(user, id);
  }

  async deliver(user: User, id: number): Promise<ResponseTransportRequestDto> {
    const request = await this.findRawById(id);

    if (request.providerId !== user.id) throw new TransportRequestAccessDeniedException();
    if (request.status !== TransportRequestStatusEnum.InTransit) {
      throw new TransportRequestInvalidStatusException(
        'Somente pedidos em trânsito podem ser entregues.',
      );
    }

    await this.prisma.transportRequest.update({
      where: { id },
      data: { status: TransportRequestStatusEnum.Delivered, deliveredAt: new Date() },
    });

    return this.findById(user, id);
  }

  async cancel(
    user: User,
    id: number,
    payload: CancelTransportRequestDto,
  ): Promise<ResponseTransportRequestDto> {
    const request = await this.findRawById(id);

    if (request.requesterId !== user.id && request.providerId !== user.id) {
      throw new TransportRequestAccessDeniedException();
    }

    const cancellable: TransportRequestStatusEnum[] = [
      TransportRequestStatusEnum.Requested,
      TransportRequestStatusEnum.Quoted,
      TransportRequestStatusEnum.Accepted,
      TransportRequestStatusEnum.InTransit,
    ];
    if (!cancellable.includes(request.status)) {
      throw new TransportRequestInvalidStatusException('Este pedido não pode mais ser cancelado.');
    }

    await this.prisma.transportRequest.update({
      where: { id },
      data: {
        status: TransportRequestStatusEnum.Cancelled,
        cancelledAt: new Date(),
        cancelReason: payload.cancelReason?.trim() || null,
      },
    });

    return this.findById(user, id);
  }

  private async findRawById(id: number) {
    const request = await this.prisma.transportRequest.findUnique({
      where: { id },
      select: { id: true, status: true, requesterId: true, providerId: true },
    });
    if (!request) throw new TransportRequestNotFoundException();
    return request;
  }

  private toResponseDto(request: any, chatRoomId: number): ResponseTransportRequestDto {
    return {
      id: request.id,
      status: request.status,
      origin: request.origin,
      destination: request.destination,
      cargoDescription: request.cargoDescription ?? undefined,
      quotedValue: request.quotedValue ? request.quotedValue.toFixed(2) : undefined,
      cancelReason: request.cancelReason ?? undefined,
      chatRoomId,
      transportation: request.transportation,
      requester: {
        id: request.requester.id,
        name: request.requester.name,
        fileUrl: request.requester.fileUrl ?? undefined,
      },
      provider: {
        id: request.provider.id,
        name: request.provider.name,
        fileUrl: request.provider.fileUrl ?? undefined,
      },
      quotedAt: request.quotedAt ?? undefined,
      acceptedAt: request.acceptedAt ?? undefined,
      rejectedAt: request.rejectedAt ?? undefined,
      deliveredAt: request.deliveredAt ?? undefined,
      cancelledAt: request.cancelledAt ?? undefined,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
