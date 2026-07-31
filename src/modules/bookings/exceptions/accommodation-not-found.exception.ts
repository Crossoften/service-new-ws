import { NotFoundException } from '@nestjs/common';

export class AccommodationForBookingNotFoundException extends NotFoundException {
  constructor() {
    super('Hospedagem não encontrada ou indisponível.');
  }
}
