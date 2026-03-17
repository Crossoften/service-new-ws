import { NotFoundException } from '@nestjs/common';

export class UploadUserNotFoundException extends NotFoundException {
  constructor() {
    super('Usuário não encontrado.');
  }
}
