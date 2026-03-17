import { ForbiddenException } from '@nestjs/common';

export class ProductSelfReviewNotAllowedException extends ForbiddenException {
  constructor() {
    super('O usuário não pode avaliar o próprio produto.');
  }
}
