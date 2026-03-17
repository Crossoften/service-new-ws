import { BadRequestException } from '@nestjs/common';

export class BudgetNotRespondedException extends BadRequestException {
  constructor() {
    super('Somente orçamentos respondidos podem ser aprovados.');
  }
}
