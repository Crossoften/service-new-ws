import { NotFoundException } from '@nestjs/common';

export class DeliveryNotFoundException extends NotFoundException {
  constructor() {
    super('Entrega não encontrada.');
  }
}
