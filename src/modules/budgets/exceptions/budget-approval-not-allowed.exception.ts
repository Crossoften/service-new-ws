import { ForbiddenException } from '@nestjs/common';

export class BudgetApprovalNotAllowedException extends ForbiddenException {
  constructor() {
    super('Somente o cliente solicitante pode aprovar o orçamento.');
  }
}
