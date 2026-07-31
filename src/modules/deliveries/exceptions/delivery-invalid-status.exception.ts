import { BadRequestException } from '@nestjs/common';

export class DeliveryInvalidStatusException extends BadRequestException {
  constructor(message = 'Esta entrega não pode ser alterada neste status.') {
    super(message);
  }
}
