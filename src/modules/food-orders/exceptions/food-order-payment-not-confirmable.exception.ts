import { BadRequestException } from '@nestjs/common';

/**
 * Confirmação manual existe para o que não passa por gateway.
 *
 * Cartão, Pix e boleto são quitados pelo provedor de pagamento; marcar à mão
 * abriria caminho para dar um pedido como pago sem que o dinheiro tenha
 * entrado.
 */
export class FoodOrderPaymentNotConfirmableException extends BadRequestException {
  constructor(motivo: string) {
    super(motivo);
  }
}
