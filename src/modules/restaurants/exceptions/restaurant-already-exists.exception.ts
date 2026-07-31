import { BadRequestException } from '@nestjs/common';

export class RestaurantAlreadyExistsException extends BadRequestException {
  constructor() {
    super('Você já possui um restaurante cadastrado.');
  }
}
