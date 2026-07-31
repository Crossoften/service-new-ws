import { BadRequestException } from '@nestjs/common';

export class TransportRequestInvalidStatusException extends BadRequestException {
  constructor(message = 'Esta operação não é permitida para o status atual do pedido.') {
    super(message);
  }
}
