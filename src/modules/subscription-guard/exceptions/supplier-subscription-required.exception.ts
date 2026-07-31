import { ForbiddenException } from '@nestjs/common';

export class SupplierSubscriptionRequiredException extends ForbiddenException {
  constructor() {
    super('É necessário ter uma assinatura ativa para realizar esta operação.');
  }
}
