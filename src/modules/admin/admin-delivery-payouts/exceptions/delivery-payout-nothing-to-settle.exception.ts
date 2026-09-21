import { ConflictException } from '@nestjs/common';

/**
 * O entregador não tem saldo em aberto.
 *
 * Acontece quando alguém repassa duas vezes seguidas, ou quando outro admin
 * liquidou antes. 409 e não 404: o entregador existe, o que não existe é dívida.
 */
export class DeliveryPayoutNothingToSettleException extends ConflictException {
  constructor() {
    super('Este entregador não tem repasse em aberto.');
  }
}
