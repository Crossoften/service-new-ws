import { ApiProperty } from '@nestjs/swagger';
import { BookingStatusEnum } from '@prisma/client';
import { IsIn } from 'class-validator';

export class RespondBookingDto {
  @ApiProperty({
    description: 'Resposta do anfitrião à solicitação de reserva.',
    enum: [BookingStatusEnum.Confirmed, BookingStatusEnum.Rejected],
    example: BookingStatusEnum.Confirmed,
  })
  @IsIn([BookingStatusEnum.Confirmed, BookingStatusEnum.Rejected], {
    message: 'A resposta deve ser Confirmed ou Rejected.',
  })
  status: typeof BookingStatusEnum.Confirmed | typeof BookingStatusEnum.Rejected;
}
