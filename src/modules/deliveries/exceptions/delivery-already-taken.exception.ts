import { BadRequestException } from '@nestjs/common';

export class DeliveryAlreadyTakenException extends BadRequestException {
  constructor() {
    super('Esta entrega já foi aceita por outro entregador.');
  }
}
