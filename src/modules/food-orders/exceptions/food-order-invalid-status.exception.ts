import { BadRequestException } from '@nestjs/common';

export class FoodOrderInvalidStatusException extends BadRequestException {
  constructor(message = 'Este pedido não pode ser alterado neste status.') {
    super(message);
  }
}
