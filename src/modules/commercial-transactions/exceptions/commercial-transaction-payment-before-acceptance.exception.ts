import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionPaymentBeforeAcceptanceException extends BadRequestException {
  constructor() {
    super('A negociação precisa estar aceita antes do pagamento.');
  }
}
