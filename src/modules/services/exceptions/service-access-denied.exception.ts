import { ForbiddenException } from '@nestjs/common';

export class ServiceAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado.');
  }
}
