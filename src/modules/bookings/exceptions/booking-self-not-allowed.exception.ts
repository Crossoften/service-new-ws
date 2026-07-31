import { BadRequestException } from '@nestjs/common';

export class BookingSelfNotAllowedException extends BadRequestException {
  constructor() {
    super('Não é possível reservar sua própria hospedagem.');
  }
}
