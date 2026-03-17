import { BadRequestException } from '@nestjs/common';

export class ServicePersistenceException extends BadRequestException {
  constructor() {
    super('Não foi possível persistir o serviço com os dados informados.');
  }
}
