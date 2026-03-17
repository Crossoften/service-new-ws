import { ForbiddenException } from '@nestjs/common';

export class ServiceReviewNotAllowedException extends ForbiddenException {
  constructor() {
    super('Somente quem ja utilizou o servico pode avalia-lo.');
  }
}
