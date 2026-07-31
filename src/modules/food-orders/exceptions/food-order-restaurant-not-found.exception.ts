import { NotFoundException } from '@nestjs/common';

export class FoodOrderRestaurantNotFoundException extends NotFoundException {
  constructor() {
    super('Restaurante não encontrado.');
  }
}
