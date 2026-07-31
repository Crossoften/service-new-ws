import { NotFoundException } from '@nestjs/common';

export class JobApplicationNotFoundException extends NotFoundException {
  constructor() {
    super('Candidatura não encontrada.');
  }
}
