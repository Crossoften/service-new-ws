import { NotFoundException } from '@nestjs/common';

export class TransportationForRequestNotFoundException extends NotFoundException {
  constructor() {
    super('Transportadora/veículo não encontrado ou indisponível.');
  }
}
