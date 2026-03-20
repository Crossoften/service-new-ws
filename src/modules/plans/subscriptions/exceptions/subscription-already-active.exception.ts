import { BadRequestException } from '@nestjs/common';

export class SubscriptionAlreadyActiveException extends BadRequestException {
  constructor() {
    super('O usuário já possui uma assinatura ativa.');
  }
}
