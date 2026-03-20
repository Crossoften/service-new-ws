import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionUnpaidCompletionNotAllowedException extends BadRequestException {
  constructor() {
    super('Somente negociações pagas podem ser concluídas.');
  }
}
