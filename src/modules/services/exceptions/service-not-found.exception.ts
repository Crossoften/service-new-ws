import { NotFoundException } from '@nestjs/common';

export class ServiceNotFoundException extends NotFoundException {
  constructor() {
    super('Serviço não encontrado.');
  }
}
