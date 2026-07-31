import { BadRequestException } from '@nestjs/common';

export class JobApplicationAlreadyExistsException extends BadRequestException {
  constructor() {
    super('Você já se candidatou a esta vaga.');
  }
}
