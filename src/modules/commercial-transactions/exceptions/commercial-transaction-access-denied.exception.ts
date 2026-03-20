import { ForbiddenException } from '@nestjs/common';

export class CommercialTransactionAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado à negociação.');
  }
}
