import { ForbiddenException } from '@nestjs/common';

export class RentalAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Você não tem acesso a este aluguel.');
  }
}
