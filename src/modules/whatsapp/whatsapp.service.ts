import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Status } from '@prisma/client';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  private readonly accessToken: string | undefined;
  private readonly phoneNumberId: string | undefined;
  private readonly apiVersion: string;
  private readonly templateName: string;
  private readonly templateLanguageCode: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v20.0';
    this.templateName =
      this.configService.get<string>('WHATSAPP_TEMPLATE_NAME') || 'notificacao_service_app';
    this.templateLanguageCode =
      this.configService.get<string>('WHATSAPP_TEMPLATE_LANGUAGE_CODE') || 'pt_BR';
  }

  private normalizePhoneNumber(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');

    if (!digits) {
      return null;
    }

    const withCountryCode = digits.length <= 11 ? `55${digits}` : digits;

    if (withCountryCode.length < 10 || withCountryCode.length > 13) {
      return null;
    }

    return withCountryCode;
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp não configurado; notificação não enviada.');
      return;
    }

    const to = this.normalizePhoneNumber(phone);

    if (!to) {
      this.logger.warn(`Número de telefone inválido para notificação via WhatsApp: ${phone}.`);
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: this.templateName,
              language: { code: this.templateLanguageCode },
              components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }],
            },
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Falha ao enviar notificação via WhatsApp (status ${response.status}): ${errorBody}`,
        );
      }
    } catch (error) {
      this.logger.error(`Erro inesperado ao enviar notificação via WhatsApp: ${error.message}`);
    }
  }

  async notifyUser(userId: number, message: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, status: true },
    });

    if (!user?.phone || user.status !== Status.Active) {
      this.logger.debug(`Usuário ${userId} sem telefone válido ou inativo; notificação ignorada.`);
      return;
    }

    await this.sendMessage(user.phone, message);
  }
}
