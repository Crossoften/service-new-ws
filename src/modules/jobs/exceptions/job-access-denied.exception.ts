import { ForbiddenException } from '@nestjs/common';

export class JobAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Você não tem acesso a esta vaga.');
  }
}
