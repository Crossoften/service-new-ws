import { ForbiddenException } from '@nestjs/common';

export class RestaurantAccessDeniedException extends ForbiddenException {
  constructor() {
    super('Você não tem acesso a este restaurante.');
  }
}
