import { BadRequestException } from '@nestjs/common';

export class ProfilePersistenceException extends BadRequestException {
  constructor() {
    super('Não foi possível salvar o perfil com os dados informados.');
  }
}
