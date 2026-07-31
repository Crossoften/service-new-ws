import { BadRequestException } from '@nestjs/common';

export class BookingUnavailableDatesException extends BadRequestException {
  constructor() {
    super('A hospedagem não está disponível para o período selecionado.');
  }
}
