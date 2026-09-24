import { BadRequestException } from '@nestjs/common';

/**
 * Renovação pedida numa assinatura com cancelamento agendado.
 *
 * Reativar e renovar são coisas diferentes e a ordem importa: reativar é de
 * graça e devolve a assinatura ao estado normal; renovar cobra outro ciclo.
 * Deixar o pagamento reativar em silêncio cobraria de quem só queria desfazer o
 * cancelamento.
 */
export class SubscriptionCancelledCannotRenewException extends BadRequestException {
  constructor() {
    super('Esta assinatura está com cancelamento agendado. Reative-a antes de renovar.');
  }
}
