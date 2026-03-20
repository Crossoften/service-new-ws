import { BadRequestException } from '@nestjs/common';

export class CommercialTransactionAlreadyFinishedException extends BadRequestException {
  constructor() {
    super('Essa negociação já foi encerrada.');
  }
}
