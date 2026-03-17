import { ForbiddenException } from '@nestjs/common';

export class BudgetProviderReplyNotAllowedException extends ForbiddenException {
  constructor() {
    super('Somente o fornecedor pode responder ao orçamento.');
  }
}
