import { BadRequestException } from '@nestjs/common';

export class BudgetCreateFailedException extends BadRequestException {
  constructor() {
    super('Não foi possível cadastrar o orçamento.');
  }
}
