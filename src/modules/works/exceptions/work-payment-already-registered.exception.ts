import { BadRequestException } from '@nestjs/common';

export class WorkPaymentAlreadyRegisteredException extends BadRequestException {
  constructor() {
    super('O pagamento desse trabalho já foi registrado.');
  }
}
