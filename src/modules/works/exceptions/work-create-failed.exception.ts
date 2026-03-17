import { BadRequestException } from '@nestjs/common';

export class WorkCreateFailedException extends BadRequestException {
  constructor() {
    super('Não foi possível cadastrar o trabalho.');
  }
}
