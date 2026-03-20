import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionPaidCancelNotAllowedException extends BadRequestException {
  constructor() {
    super('Negociações pagas não podem ser canceladas por essa rota.');
  }
}
