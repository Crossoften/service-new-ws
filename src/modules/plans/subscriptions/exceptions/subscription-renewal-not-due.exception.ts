import { BadRequestException } from '@nestjs/common';

import { JANELA_DE_RENOVACAO_DIAS } from '../subscription-period';

/**
 * Renovação pedida cedo demais.
 *
 * A janela existe para a cobrança acompanhar o que a tela mostra: o botão só
 * aparece a sete dias do fim, e aceitar renovação fora disso permitiria
 * empilhar ciclos por engano — cada pagamento confirmado estica o vencimento.
 */
export class SubscriptionRenewalNotDueException extends BadRequestException {
  constructor(daysUntilExpiration: number) {
    super(
      `A renovação fica disponível a ${JANELA_DE_RENOVACAO_DIAS} dias do vencimento. ` +
        `Faltam ${daysUntilExpiration} dias.`,
    );
  }
}
