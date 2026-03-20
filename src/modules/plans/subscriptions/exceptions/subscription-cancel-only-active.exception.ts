import { BadRequestException } from '@nestjs/common';

export class SubscriptionCancelOnlyActiveException extends BadRequestException {
  constructor() {
    super('Somente assinaturas ativas podem ser canceladas.');
  }
}
