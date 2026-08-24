import { ForbiddenException } from '@nestjs/common';

export class UploadAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Acesso não autorizado.');
  }
}
