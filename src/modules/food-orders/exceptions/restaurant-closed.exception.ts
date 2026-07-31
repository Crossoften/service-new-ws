import { BadRequestException } from '@nestjs/common';

export class RestaurantClosedException extends BadRequestException {
  constructor() {
    super('O restaurante não está disponível para pedidos no momento.');
  }
}
