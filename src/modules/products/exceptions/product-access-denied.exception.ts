import { ForbiddenException } from '@nestjs/common';

export class ProductAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado.');
  }
}
