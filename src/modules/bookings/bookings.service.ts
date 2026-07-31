import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { BookingStatusEnum, ChatContextType, Prisma, User } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RespondBookingDto } from './dto/respond-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import {
  CreateBookingResponseDto,
  ResponseFindAllBookingDto,
  ResponseBookingDto,
} from './dto/response-booking.dto';
import { BookingAccessDeniedException } from './exceptions/booking-access-denied.exception';
import { BookingInvalidStatusException } from './exceptions/booking-invalid-status.exception';
import { BookingNotFoundException } from './exceptions/booking-not-found.exception';
import { AccommodationForBookingNotFoundException } from './exceptions/accommodation-not-found.exception';
import { BookingSelfNotAllowedException } from './exceptions/booking-self-not-allowed.exception';
import { BookingUnavailableDatesException } from './exceptions/booking-unavailable-dates.exception';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly select = Prisma.validator<Prisma.BookingSelect>()({
    id: true,
    status: true,
    checkIn: true,
    checkOut: true,
    guests: true,
    totalValue: true,
    cancelReason: true,
    requesterId: true,
    providerId: true,
    confirmedAt: true,
    rejectedAt: true,
    checkedInAt: true,
    completedAt: true,
    cancelledAt: true,
    createdAt: true,
    updatedAt: true,
    accommodation: { select: { id: true, name: true, imageUrl: true } },
    requester: { select: { id: true, name: true, fileUrl: true } },
    provider: { select: { id: true, name: true, fileUrl: true } },
  });

  async create(user: User, payload: CreateBookingDto): Promise<CreateBookingResponseDto> {
    const accommodation = await this.prisma.accommodation.findUnique({
      where: { id: payload.accommodationId },
      select: { id: true, name: true, userId: true, isActive: true },
    });

    if (!accommodation || !accommodation.isActive) {
      throw new AccommodationForBookingNotFoundException();
    }

    if (accommodation.userId === user.id) {
      throw new BookingSelfNotAllowedException();
    }

    const checkIn = new Date(payload.checkIn);
    const checkOut = new Date(payload.checkOut);
    if (checkOut <= checkIn) {
      throw new BookingInvalidStatusException(
        'A data de check-out deve ser posterior à data de check-in.',
      );
    }

    await this.assertDatesAvailable(accommodation.id, checkIn, checkOut);

    const defaultMessage = `Solicitação de reserva de "${accommodation.name}" para ${payload.guests} hóspede(s).`;

    const created = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          status: BookingStatusEnum.Requested,
          checkIn,
          checkOut,
          guests: payload.guests,
          totalValue: new Prisma.Decimal(payload.totalValue),
          accommodationId: accommodation.id,
          requesterId: user.id,
          providerId: accommodation.userId,
        },
        select: { id: true },
      });

      await tx.chatRoom.create({
        data: {
          contextType: ChatContextType.Booking,
          referenceId: booking.id,
          createdById: user.id,
          lastMessageAt: new Date(),
          participants: { create: [{ userId: user.id }, { userId: accommodation.userId }] },
          messages: { create: { senderId: user.id, message: defaultMessage } },
        },
      });

      return booking;
    });

    return {
      message: 'Solicitação de reserva enviada com sucesso.',
      booking: await this.findById(user, created.id),
    };
  }

  async findAll(user: User, query: QueryBookingDto): Promise<ResponseFindAllBookingDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const participantFilter: Prisma.BookingWhereInput =
      query.participantRole === 'Requester'
        ? { requesterId: user.id }
        : query.participantRole === 'Provider'
          ? { providerId: user.id }
          : { OR: [{ requesterId: user.id }, { providerId: user.id }] };

    const where: Prisma.BookingWhereInput = {
      ...participantFilter,
      ...(query.status && { status: query.status }),
    };

    const [bookings, totalRecords] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        select: this.select,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        contextType: ChatContextType.Booking,
        referenceId: { in: bookings.map((b) => b.id) },
      },
      select: { id: true, referenceId: true },
    });
    const roomMap = new Map(rooms.map((room) => [room.referenceId, room.id]));

    return {
      bookings: bookings.map((b) => this.toResponseDto(b, roomMap.get(b.id) || 0)),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(user: User, id: number): Promise<ResponseBookingDto> {
    const booking = await this.prisma.booking.findUnique({ where: { id }, select: this.select });

    if (!booking) throw new BookingNotFoundException();
    if (booking.requesterId !== user.id && booking.providerId !== user.id) {
      throw new BookingAccessDeniedException();
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { contextType_referenceId: { contextType: ChatContextType.Booking, referenceId: id } },
      select: { id: true },
    });

    return this.toResponseDto(booking, room?.id || 0);
  }

  async respond(user: User, id: number, payload: RespondBookingDto): Promise<ResponseBookingDto> {
    const booking = await this.findRawById(id);

    if (booking.providerId !== user.id) throw new BookingAccessDeniedException();
    if (booking.status !== BookingStatusEnum.Requested) {
      throw new BookingInvalidStatusException(
        'Somente solicitações pendentes podem ser respondidas.',
      );
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: payload.status,
          confirmedAt: payload.status === BookingStatusEnum.Confirmed ? now : undefined,
          rejectedAt: payload.status === BookingStatusEnum.Rejected ? now : undefined,
        },
      });

      if (payload.status === BookingStatusEnum.Confirmed) {
        const dates = this.enumerateDates(booking.checkIn, booking.checkOut);
        await tx.accommodationAvailability.createMany({
          data: dates.map((date) => ({
            accommodationId: booking.accommodationId,
            date,
            isBlocked: true,
            reason: `Reserva #${booking.id}`,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.findById(user, id);
  }

  async checkIn(user: User, id: number): Promise<ResponseBookingDto> {
    const booking = await this.findRawById(id);

    if (booking.providerId !== user.id) throw new BookingAccessDeniedException();
    if (booking.status !== BookingStatusEnum.Confirmed) {
      throw new BookingInvalidStatusException('Somente reservas confirmadas podem dar check-in.');
    }

    await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatusEnum.CheckedIn, checkedInAt: new Date() },
    });

    return this.findById(user, id);
  }

  async complete(user: User, id: number): Promise<ResponseBookingDto> {
    const booking = await this.findRawById(id);

    if (booking.providerId !== user.id) throw new BookingAccessDeniedException();
    if (booking.status !== BookingStatusEnum.CheckedIn) {
      throw new BookingInvalidStatusException(
        'Somente reservas com check-in podem ser concluídas.',
      );
    }

    await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatusEnum.Completed, completedAt: new Date() },
    });

    return this.findById(user, id);
  }

  async cancel(user: User, id: number, payload: CancelBookingDto): Promise<ResponseBookingDto> {
    const booking = await this.findRawById(id);

    if (booking.requesterId !== user.id && booking.providerId !== user.id) {
      throw new BookingAccessDeniedException();
    }

    const cancellable: BookingStatusEnum[] = [
      BookingStatusEnum.Requested,
      BookingStatusEnum.Confirmed,
      BookingStatusEnum.CheckedIn,
    ];
    if (!cancellable.includes(booking.status)) {
      throw new BookingInvalidStatusException('Esta reserva não pode mais ser cancelada.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatusEnum.Cancelled,
          cancelledAt: new Date(),
          cancelReason: payload.cancelReason?.trim() || null,
        },
      });

      await tx.accommodationAvailability.deleteMany({
        where: {
          accommodationId: booking.accommodationId,
          reason: `Reserva #${booking.id}`,
        },
      });
    });

    return this.findById(user, id);
  }

  private async assertDatesAvailable(
    accommodationId: number,
    checkIn: Date,
    checkOut: Date,
  ): Promise<void> {
    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        accommodationId,
        status: { in: [BookingStatusEnum.Confirmed, BookingStatusEnum.CheckedIn] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { id: true },
    });

    if (overlappingBooking) {
      throw new BookingUnavailableDatesException();
    }

    const blockedDate = await this.prisma.accommodationAvailability.findFirst({
      where: {
        accommodationId,
        isBlocked: true,
        date: { gte: checkIn, lt: checkOut },
      },
      select: { id: true },
    });

    if (blockedDate) {
      throw new BookingUnavailableDatesException();
    }
  }

  private enumerateDates(checkIn: Date, checkOut: Date): Date[] {
    const dates: Date[] = [];
    const cursor = new Date(checkIn);
    while (cursor < checkOut) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  private async findRawById(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        requesterId: true,
        providerId: true,
        accommodationId: true,
        checkIn: true,
        checkOut: true,
      },
    });
    if (!booking) throw new BookingNotFoundException();
    return booking;
  }

  private toResponseDto(booking: any, chatRoomId: number): ResponseBookingDto {
    return {
      id: booking.id,
      status: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      totalValue: booking.totalValue.toFixed(2),
      cancelReason: booking.cancelReason ?? undefined,
      chatRoomId,
      accommodation: booking.accommodation,
      requester: {
        id: booking.requester.id,
        name: booking.requester.name,
        fileUrl: booking.requester.fileUrl ?? undefined,
      },
      provider: {
        id: booking.provider.id,
        name: booking.provider.name,
        fileUrl: booking.provider.fileUrl ?? undefined,
      },
      confirmedAt: booking.confirmedAt ?? undefined,
      rejectedAt: booking.rejectedAt ?? undefined,
      checkedInAt: booking.checkedInAt ?? undefined,
      completedAt: booking.completedAt ?? undefined,
      cancelledAt: booking.cancelledAt ?? undefined,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
