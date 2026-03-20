import { ForbiddenException } from '@nestjs/common';

export class CommercialTransactionBuyerCompletionNotAllowedException extends ForbiddenException {
  constructor() {
    super('Somente o comprador pode concluir a negociação.');
  }
}
