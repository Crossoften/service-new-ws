import { ForbiddenException } from '@nestjs/common';

export class TransportationSelfReviewNotAllowedException extends ForbiddenException {
  constructor() {
    super('O usuário não pode avaliar o próprio transporte.');
  }
}
