import { ForbiddenException } from '@nestjs/common';

export class CommercialTransactionSellerResponseNotAllowedException extends ForbiddenException {
  constructor() {
    super('Somente o vendedor pode responder a negociação.');
  }
}
