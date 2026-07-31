import { ForbiddenException } from '@nestjs/common';

export class BookingAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Você não tem acesso a esta reserva.');
  }
}
