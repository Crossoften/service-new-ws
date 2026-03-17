import { NotFoundException } from '@nestjs/common';

export class TransportationNotFoundException extends NotFoundException {
  constructor() {
    super('Transporte não encontrado.');
  }
}
