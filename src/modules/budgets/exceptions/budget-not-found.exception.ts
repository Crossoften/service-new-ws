import { NotFoundException } from '@nestjs/common';

export class BudgetNotFoundException extends NotFoundException {
  constructor() {
    super('Orçamento não encontrado.');
  }
}
