import { BadRequestException } from '@nestjs/common';

/**
 * O cupom existe, mas não vale para este pedido.
 *
 * Uma exceção só, com a mensagem dizendo o motivo, em vez de uma classe por
 * regra: a tela mostra o texto direto, e o cliente não ganha nada em distinguir
 * "expirado" de "esgotado" por código HTTP.
 */
export class CouponNotApplicableException extends BadRequestException {
  constructor(motivo: string) {
    super(motivo);
  }
}
