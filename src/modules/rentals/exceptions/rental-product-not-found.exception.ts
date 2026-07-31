import { NotFoundException } from '@nestjs/common';

export class RentalProductNotFoundException extends NotFoundException {
  constructor() {
    super('Produto não encontrado ou indisponível.');
  }
}
