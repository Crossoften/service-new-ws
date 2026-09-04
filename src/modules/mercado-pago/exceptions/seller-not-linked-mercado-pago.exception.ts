import { BadRequestException } from '@nestjs/common';

/**
 * O vendedor precisa ter vinculado a conta do Mercado Pago para receber.
 *
 * Lançada apenas quando o pagamento vai de fato passar pelo gateway. Venda
 * liquidada por fora — dinheiro na entrega, por exemplo — não depende do
 * vínculo e não deve ser bloqueada por ele.
 */
export class SellerNotLinkedMercadoPagoException extends BadRequestException {
  constructor() {
    super('O vendedor ainda não vinculou uma conta do Mercado Pago para receber pagamentos.');
  }
}
