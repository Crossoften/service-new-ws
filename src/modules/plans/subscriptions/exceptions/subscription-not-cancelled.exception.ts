import { BadRequestException } from '@nestjs/common';

export class SubscriptionNotCancelledException extends BadRequestException {
  constructor() {
    super('Esta assinatura não está com cancelamento agendado.');
  }
}
