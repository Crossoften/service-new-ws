import { ForbiddenException } from '@nestjs/common';

export class AccommodationSelfReviewNotAllowedException extends ForbiddenException {
  constructor() {
    super('O usuário não pode avaliar a própria hospedagem.');
  }
}
