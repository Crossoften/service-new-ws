import { BadRequestException } from '@nestjs/common';

export class JobApplicationInvalidStatusException extends BadRequestException {
  constructor(message = 'Esta candidatura já foi respondida.') {
    super(message);
  }
}
