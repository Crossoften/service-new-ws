import { NotFoundException } from '@nestjs/common';

export class SubscriptionActiveNotFoundException extends NotFoundException {
  constructor() {
    super('Assinatura ativa não encontrada.');
  }
}
