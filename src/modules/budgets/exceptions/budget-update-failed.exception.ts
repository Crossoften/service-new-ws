import { BadRequestException } from '@nestjs/common';

export class BudgetUpdateFailedException extends BadRequestException {
  constructor() {
    super('Não foi possível atualizar o orçamento.');
  }
}
