import { ForbiddenException } from '@nestjs/common';

export class CommercialTransactionBuyerPaymentNotAllowedException extends ForbiddenException {
  constructor() {
    super('Somente o comprador pode registrar o pagamento.');
  }
}
