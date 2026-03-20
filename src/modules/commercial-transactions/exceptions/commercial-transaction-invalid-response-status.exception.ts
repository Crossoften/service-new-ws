import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionInvalidResponseStatusException extends BadRequestException {
  constructor() {
    super('Status de resposta inválido.');
  }
}
