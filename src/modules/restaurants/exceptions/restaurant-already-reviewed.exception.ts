import { ConflictException } from '@nestjs/common';

export class RestaurantAlreadyReviewedException extends ConflictException {
  constructor() {
    super('Você já avaliou este restaurante.');
  }
}
