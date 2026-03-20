import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionPendingResponseOnlyException extends BadRequestException {
  constructor() {
    super('Somente negociações pendentes podem ser respondidas.');
  }
}
