import { BadRequestException } from '@nestjs/common';

export class FoodOrderAddressRequiredException extends BadRequestException {
  constructor() {
    super('É necessário ter um endereço cadastrado para realizar pedidos de delivery.');
  }
}
