import { NotFoundException } from '@nestjs/common';

export class JobNotFoundException extends NotFoundException {
  constructor() {
    super('Vaga não encontrada.');
  }
}
