import { BadRequestException } from '@nestjs/common';

export class WorkUpdateFailedException extends BadRequestException {
  constructor() {
    super('Não foi possível atualizar o trabalho.');
  }
}
