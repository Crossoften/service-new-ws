import { BadRequestException } from '@nestjs/common';

export class BookingInvalidStatusException extends BadRequestException {
  constructor(message = 'Esta operação não é permitida para o status atual da reserva.') {
    super(message);
  }
}
