import { ForbiddenException } from '@nestjs/common';

export class DeliveryAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Você não tem permissão para acessar esta entrega.');
  }
}
