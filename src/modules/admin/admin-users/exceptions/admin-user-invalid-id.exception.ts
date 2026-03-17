import { BadRequestException } from '@nestjs/common';

export class AdminUserInvalidIdException extends BadRequestException {
  constructor() {
    super('Id do usuário inválido.');
  }
}
