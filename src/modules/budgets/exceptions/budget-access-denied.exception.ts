import { ForbiddenException } from '@nestjs/common';

export class BudgetAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado.');
  }
}
