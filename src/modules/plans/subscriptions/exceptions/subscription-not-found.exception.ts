import { NotFoundException } from '@nestjs/common';

export class SubscriptionNotFoundException extends NotFoundException {
  constructor() {
    super('Assinatura não encontrada.');
  }
}
