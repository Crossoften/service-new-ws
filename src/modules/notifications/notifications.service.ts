import { Injectable } from '@nestjs/common';

import { PushPayload, PushService } from '../push/push.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

/**
 * Ponto único de notificação ao usuário.
 *
 * Existe porque a mensagem era enviada só por WhatsApp, em dezenove pontos
 * espalhados por seis serviços. Acrescentar push ali significaria repetir a
 * mesma mensagem em dezenove lugares, e o próximo canal, de novo.
 *
 * Os serviços de negócio passam a falar com este, que decide os canais.
 * Assinatura idêntica à que o `WhatsappService` já expunha, de propósito: a
 * migração dos pontos de chamada é só a troca do identificador.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly pushService: PushService,
  ) {}

  /**
   * Avisa o usuário por todos os canais disponíveis.
   *
   * Nunca lança. Notificação é acessório: falhar aqui não pode derrubar o
   * pedido, o pagamento ou a entrega que a disparou. Cada canal já trata os
   * próprios erros internamente; o `catch` aqui é a última barreira.
   *
   * `title` é opcional porque quase todo ponto de chamada tem só uma frase —
   * sem ele, a notificação usa o nome do app como título.
   */
  async notifyUser(userId: number, message: string, title?: string): Promise<void> {
    const payload: PushPayload = {
      title: title ?? 'Service',
      body: message,
    };

    await Promise.all([
      this.whatsappService.notifyUser(userId, message).catch(() => undefined),
      this.pushService.notifyUser(userId, payload).catch(() => undefined),
    ]);
  }
}
