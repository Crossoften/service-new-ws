import { NotFoundException } from '@nestjs/common';

export class ProductCategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Categoria de produto não encontrada.');
  }
}
