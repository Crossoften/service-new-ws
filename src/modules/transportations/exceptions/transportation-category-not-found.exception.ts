import { NotFoundException } from '@nestjs/common';

export class TransportationCategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Categoria de transporte não encontrada.');
  }
}
