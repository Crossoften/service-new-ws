import { NotFoundException } from '@nestjs/common';

export class SubscriptionCategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Categoria de atuação não encontrada ou inativa.');
  }
}
