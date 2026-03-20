import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionPaymentAlreadyRegisteredException extends BadRequestException {
  constructor() {
    super('Já existe um pagamento registrado para essa negociação.');
  }
}
