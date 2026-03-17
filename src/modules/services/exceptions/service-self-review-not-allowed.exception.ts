import { ForbiddenException } from '@nestjs/common';

export class ServiceSelfReviewNotAllowedException extends ForbiddenException {
  constructor() {
    super('Você não pode avaliar o próprio serviço.');
  }
}
