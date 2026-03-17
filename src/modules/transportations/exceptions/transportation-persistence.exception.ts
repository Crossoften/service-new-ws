import { BadRequestException } from '@nestjs/common';

export class TransportationPersistenceException extends BadRequestException {
  constructor() {
    super('Não foi possível persistir o transporte com os dados informados.');
  }
}
