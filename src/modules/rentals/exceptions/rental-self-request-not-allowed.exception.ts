import { BadRequestException } from '@nestjs/common';

export class RentalSelfRequestNotAllowedException extends BadRequestException {
  constructor() {
    super('Não é possível solicitar aluguel do seu próprio produto.');
  }
}
