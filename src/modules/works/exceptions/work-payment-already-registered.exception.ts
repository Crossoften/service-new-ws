import { BadRequestException } from '@nestjs/common';

/**
 * Já existe checkout vivo para este trabalho.
 *
 * "Vivo" é `Pending` ou `Paid`. Gerar um segundo enquanto o primeiro está em
 * aberto deixaria as duas preferências válidas no Mercado Pago, e o cliente
 * poderia pagar as duas. Já um pagamento `Cancelled` — recusado, marcado assim
 * pelo webhook — não bloqueia: é justamente o caso em que o cliente precisa
 * tentar de novo.
 */
export class WorkPaymentAlreadyRegisteredException extends BadRequestException {
  constructor() {
    super(
      'Já existe um pagamento em aberto para este trabalho. ' +
        'Conclua ou aguarde o vencimento antes de gerar outro.',
    );
  }
}
