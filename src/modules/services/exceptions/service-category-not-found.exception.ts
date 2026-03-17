import { NotFoundException } from '@nestjs/common';

export class ServiceCategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Categoria de serviço não encontrada.');
  }
}
