import { ForbiddenException } from '@nestjs/common';

export class TransportRequestAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Você não tem acesso a este pedido de transporte.');
  }
}
