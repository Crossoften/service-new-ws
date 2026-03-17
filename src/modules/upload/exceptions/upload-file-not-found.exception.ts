import { NotFoundException } from '@nestjs/common';

export class UploadFileNotFoundException extends NotFoundException {
  constructor() {
    super('Arquivo não encontrado.');
  }
}
