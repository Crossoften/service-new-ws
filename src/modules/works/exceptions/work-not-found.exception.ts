import { NotFoundException } from '@nestjs/common';

export class WorkNotFoundException extends NotFoundException {
  constructor() {
    super('Trabalho não encontrado.');
  }
}
