import { BadRequestException } from '@nestjs/common';

export class FoodOrderMenuItemNotFoundException extends BadRequestException {
  constructor() {
    super('Um ou mais itens do pedido não foram encontrados ou não pertencem ao restaurante.');
  }
}
