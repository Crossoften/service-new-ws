import { NotFoundException } from '@nestjs/common';

export class AccommodationCategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Categoria de hospedagem não encontrada.');
  }
}
