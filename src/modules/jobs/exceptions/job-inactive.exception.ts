import { BadRequestException } from '@nestjs/common';

export class JobInactiveException extends BadRequestException {
  constructor() {
    super('Esta vaga não está mais ativa.');
  }
}
