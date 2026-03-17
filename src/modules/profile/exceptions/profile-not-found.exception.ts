import { NotFoundException } from '@nestjs/common';

export class ProfileNotFoundException extends NotFoundException {
  constructor() {
    super('Perfil não encontrado.');
  }
}
