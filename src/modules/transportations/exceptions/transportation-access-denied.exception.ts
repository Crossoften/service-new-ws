import { ForbiddenException } from '@nestjs/common';

export class TransportationAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado.');
  }
}
