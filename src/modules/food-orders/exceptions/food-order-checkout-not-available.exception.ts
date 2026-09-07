import { BadRequestException } from '@nestjs/common';

/**
 * O pedido não está em condição de gerar um checkout de pagamento.
 *
 * Cobre três casos distintos com o mesmo código: pedido em dinheiro (que é
 * liquidado em mãos e não passa pelo gateway), pedido já pago e pedido que já
 * tem um checkout em aberto. A mensagem diferencia — o status HTTP não precisa.
 */
export class FoodOrderCheckoutNotAvailableException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
