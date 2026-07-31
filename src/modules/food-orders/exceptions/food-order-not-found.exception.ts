import { NotFoundException } from '@nestjs/common';

export class FoodOrderNotFoundException extends NotFoundException {
  constructor() {
    super('Pedido não encontrado.');
  }
}
