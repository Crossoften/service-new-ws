import { NotFoundException } from '@nestjs/common';

export class RentalNotFoundException extends NotFoundException {
  constructor() {
    super('Aluguel não encontrado.');
  }
}
