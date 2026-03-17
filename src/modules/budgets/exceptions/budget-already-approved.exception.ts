import { BadRequestException } from '@nestjs/common';

export class BudgetAlreadyApprovedException extends BadRequestException {
  constructor() {
    super('Este orçamento já foi aprovado.');
  }
}
