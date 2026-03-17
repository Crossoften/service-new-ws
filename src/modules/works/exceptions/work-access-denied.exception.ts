import { ForbiddenException } from '@nestjs/common';

export class WorkAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado.');
  }
}
