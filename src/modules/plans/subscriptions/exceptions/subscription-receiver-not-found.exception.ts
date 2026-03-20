import { BadRequestException } from '@nestjs/common';

export class SubscriptionReceiverNotFoundException extends BadRequestException {
  constructor() {
    super('Nenhum administrador disponível para receber a assinatura.');
  }
}
