import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Status } from '@prisma/client';
import Twilio = require('twilio');

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  private readonly client: Twilio.Twilio | null;
  private readonly fromNumber: string | undefined;
  private readonly contentSid: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_FROM');
    this.contentSid = this.configService.get<string>('TWILIO_WHATSAPP_CONTENT_SID');
    this.client = accountSid && authToken ? Twilio(accountSid, authToken) : null;
  }

  private normalizePhoneNumber(phone: string): string | null {
    if (typeof phone !== 'string') {
      return null;
    }

    const digits = phone.replace(/\D/g, '');

    if (!digits) {
      return null;
    }

    const withCountryCode = digits.length <= 11 ? `55${digits}` : digits;

    if (withCountryCode.length < 12 || withCountryCode.length > 13) {
      return null;
    }

    return `whatsapp:+${withCountryCode}`;
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.client || !this.fromNumber || !this.contentSid) {
      this.logger.warn('WhatsApp via Twilio não configurado; notificação não enviada.');
      return;
    }

    const to = this.normalizePhoneNumber(phone);

    if (!to) {
      this.logger.warn(`Número de telefone inválido para notificação via WhatsApp: ${phone}.`);
      return;
    }

    const content = typeof message === 'string' ? message.replace(/\r?\n/g, ' ').trim() : '';

    if (!content) {
      this.logger.warn('Mensagem vazia para notificação via WhatsApp; envio ignorado.');
      return;
    }

    try {
      await this.client.messages.create({
        from: this.fromNumber,
        to,
        contentSid: this.contentSid,
        contentVariables: JSON.stringify({ 1: content }),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha ao enviar notificação via WhatsApp pelo Twilio: ${errorMessage}`);
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
