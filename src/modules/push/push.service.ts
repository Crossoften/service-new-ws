import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';

import { SavePushSubscriptionDto } from './dto/save-push-subscription.dto';

/** Carga entregue ao service worker. */
export interface PushPayload {
  title: string;
  body: string;
  /** Caminho aberto ao clicar na notificação. */
  url?: string;
  tag?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly publicKey: string | undefined;
  private readonly configured: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT');

    this.configured = Boolean(this.publicKey && privateKey && subject);

    if (this.configured) {
      webPush.setVapidDetails(subject as string, this.publicKey as string, privateKey as string);
    } else {
      this.logger.warn(
        'Web Push não configurado (VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY); ' +
          'as notificações são apenas registradas em log.',
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Chave pública, para o navegador se inscrever.
   *
   * Pública por natureza — é ela que vai no `applicationServerKey` do
   * `pushManager.subscribe`. A privada nunca sai do servidor.
   */
  getPublicKey(): string | null {
    return this.configured ? (this.publicKey as string) : null;
  }

  /**
   * Registra ou atualiza a inscrição de um navegador.
   *
   * `upsert` por `endpoint`: o navegador pode reinscrever o mesmo endereço com
   * chaves novas, e isso é atualização, não uma segunda inscrição. O `userId`
   * também é reescrito — um aparelho compartilhado troca de dono.
   */
  async saveSubscription(
    userId: number,
    payload: SavePushSubscriptionDto,
    userAgent?: string,
  ): Promise<{ message: string }> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: payload.endpoint },
      create: {
        userId,
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
      update: {
        userId,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
    });

    return { message: 'Inscrição registrada com sucesso.' };
  }

  /**
   * Remove a inscrição. Idempotente: desinscrever o que já não existe não é
   * erro — o navegador pode ter perdido a inscrição antes de avisar o servidor.
   */
  async removeSubscription(userId: number, endpoint: string): Promise<{ message: string }> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });

    return { message: 'Inscrição removida.' };
  }

  /**
   * Envia a notificação para todos os navegadores do usuário.
   *
   * Nunca lança: notificação é acessório e não pode derrubar a operação de
   * negócio que a disparou — mesma regra do WhatsApp.
   */
  async notifyUser(userId: number, payload: PushPayload): Promise<void> {
    if (!this.configured) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });

    if (subscriptions.length === 0) return;

    const corpo = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            corpo,
          );

          await this.prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastSentAt: new Date() },
          });
        } catch (error) {
          await this.handleSendError(subscription.id, subscription.endpoint, error);
        }
      }),
    );
  }

  /**
   * Inscrição morta é apagada; qualquer outra falha é só registrada.
   *
   * `404` e `410` são a forma do navegador dizer que aquela inscrição não existe
   * mais — o usuário revogou a permissão, limpou os dados ou desinstalou o app.
   * Mantê-la faria o servidor tentar entregar para sempre, e a cada evento.
   */
  private async handleSendError(id: number, endpoint: string, error: unknown): Promise<void> {
    const status = (error as { statusCode?: number })?.statusCode;

    if (status === 404 || status === 410) {
      await this.prisma.pushSubscription.delete({ where: { id } }).catch(() => undefined);
      this.logger.debug(`Inscrição de push removida por estar expirada (${endpoint}).`);
      return;
    }

    this.logger.error(
      `Falha ao enviar push. status=${status ?? 'n/d'}: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
}
