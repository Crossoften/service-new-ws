import { ConflictException } from '@nestjs/common';

/**
 * Dois repasses do mesmo entregador ao mesmo tempo.
 *
 * O `UPDATE ... WHERE payoutId IS NULL` afetou menos linhas do que o esperado,
 * o que significa que outra transação liquidou parte dos créditos no intervalo.
 * A transação inteira é desfeita: melhor o admin repetir do que o entregador
 * receber duas vezes pela mesma entrega.
 */
export class DeliveryPayoutConcurrentException extends ConflictException {
  constructor() {
    super(
      'Outro repasse para este entregador foi registrado ao mesmo tempo. ' +
        'Recarregue os saldos e tente novamente.',
    );
  }
}
