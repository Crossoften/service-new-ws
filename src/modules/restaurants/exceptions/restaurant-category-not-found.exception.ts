import { NotFoundException } from '@nestjs/common';

export class RestaurantCategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Categoria de restaurante não encontrada.');
  }
}
