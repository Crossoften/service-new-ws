import { BadRequestException } from '@nestjs/common';

export class RentalInvalidStatusException extends BadRequestException {
  constructor(message = 'Esta operação não é permitida para o status atual do aluguel.') {
    super(message);
  }
}
