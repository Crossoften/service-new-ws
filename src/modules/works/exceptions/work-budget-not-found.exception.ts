import { NotFoundException } from '@nestjs/common';

export class WorkBudgetNotFoundException extends NotFoundException {
  constructor() {
    super('Orçamento não encontrado.');
  }
}
