import { BadRequestException } from '@nestjs/common';

export class TransportRequestSelfNotAllowedException extends BadRequestException {
  constructor() {
    super('Não é possível solicitar transporte da sua própria transportadora.');
  }
}
