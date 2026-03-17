import { BadRequestException } from '@nestjs/common';

export class AccommodationPersistenceException extends BadRequestException {
  constructor() {
    super('Não foi possível persistir a hospedagem com os dados informados.');
  }
}
