import { ForbiddenException } from '@nestjs/common';

export class FoodOrderAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Você não tem acesso a este pedido.');
  }
}
