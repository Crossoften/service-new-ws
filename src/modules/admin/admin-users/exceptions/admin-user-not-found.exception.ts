import { NotFoundException } from '@nestjs/common';

export class AdminUserNotFoundException extends NotFoundException {
  constructor() {
    super('Usuário não encontrado.');
  }
}
