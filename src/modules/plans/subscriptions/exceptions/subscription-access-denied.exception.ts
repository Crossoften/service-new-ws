import { ForbiddenException } from '@nestjs/common';

export class SubscriptionAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado à assinatura.');
  }
}
