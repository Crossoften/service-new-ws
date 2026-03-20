import { NotFoundException } from '@nestjs/common';

export class CommercialTransactionNotFoundException extends NotFoundException {
  constructor() {
    super('Negociação não encontrada.');
  }
}
