import { BadRequestException } from '@nestjs/common';

export class WorkBudgetNotRespondedException extends BadRequestException {
  constructor() {
    super('Somente orçamentos respondidos podem virar trabalho.');
  }
}
