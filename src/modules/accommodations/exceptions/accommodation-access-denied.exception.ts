import { ForbiddenException } from '@nestjs/common';

export class AccommodationAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado.');
  }
}
