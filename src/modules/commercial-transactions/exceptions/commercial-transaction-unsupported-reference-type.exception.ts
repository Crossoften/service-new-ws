import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionUnsupportedReferenceTypeException extends BadRequestException {
  constructor() {
    super('O tipo de referência informado ainda não é suportado.');
  }
}
