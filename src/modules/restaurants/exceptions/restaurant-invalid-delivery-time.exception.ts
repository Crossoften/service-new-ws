import { BadRequestException } from '@nestjs/common';

/**
 * A faixa de tempo de entrega precisa fazer sentido como faixa.
 *
 * `class-validator` valida campo a campo; a comparação entre dois campos do
 * mesmo objeto exige validador próprio. Como é uma regra só, fica aqui — e
 * assim a mensagem pode explicar o que está errado, em vez de apontar um campo.
 */
export class RestaurantInvalidDeliveryTimeException extends BadRequestException {
  constructor() {
    super('O tempo máximo de entrega não pode ser menor que o mínimo.');
  }
}
