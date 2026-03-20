import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionSelfRequestNotAllowedException extends BadRequestException {
  constructor() {
    super('Você não pode abrir uma negociação para o próprio produto.');
  }
}
