import { NotFoundException } from '@nestjs/common';

export class TransportRequestNotFoundException extends NotFoundException {
  constructor() {
    super('Pedido de transporte não encontrado.');
  }
}
