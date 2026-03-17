import { NotFoundException } from '@nestjs/common';

export class AccommodationNotFoundException extends NotFoundException {
  constructor() {
    super('Hospedagem não encontrada.');
  }
}
