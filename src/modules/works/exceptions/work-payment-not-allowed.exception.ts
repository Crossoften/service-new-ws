import { ForbiddenException } from '@nestjs/common';

export class WorkPaymentNotAllowedException extends ForbiddenException {
  constructor() {
    super('Somente o cliente solicitante pode registrar o pagamento do trabalho.');
  }
}
