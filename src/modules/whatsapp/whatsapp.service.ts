import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Status } from '@prisma/client';
import { normalizePhoneBR } from '@utils/normalizePhone';
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

    // Mesma guarda do SmsService: o SDK do Twilio valida o formato do SID no
    // construtor e lança se ele não começar com "AC". Checar apenas se a
    // variável tem valor deixa passar o placeholder do .env.example e derruba o
    // bootstrap da aplicação inteira. Validando o formato, o serviço apenas
    // fica desabilitado (client = null) e o envio é ignorado com log.
    this.client = accountSid?.startsWith('AC') && authToken ? Twilio(accountSid, authToken) : null;
  }

  private toWhatsappAddress(phone: string): string | null {
    const e164 = normalizePhoneBR(phone);

    return e164 ? `whatsapp:${e164}` : null;
  }

  hasCredentials(): boolean {
    return Boolean(this.client && this.fromNumber && this.contentSid);
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.hasCredentials()) {
      this.logger.warn('WhatsApp via Twilio não configurado; notificação não enviada.');
      return;
    }

    const to = this.toWhatsappAddress(phone);

    if (!to) {
      this.logger.warn(`Número de telefone inválido para notificação via WhatsApp: ${phone}.`);
      return;
    }

    // As Content Templates do Twilio recebem as variáveis como texto simples.
    // Quebras de linha invalidam a substituição, então normalizamos para espaço.
    const conteudo = message.replace(/\r?\n/g, ' ').trim();

    if (!conteudo) {
      this.logger.warn('Mensagem vazia para notificação via WhatsApp; envio ignorado.');
      return;
    }

    try {
      await this.client.messages.create({
        from: this.fromNumber,
        to,
        contentSid: this.contentSid,
        contentVariables: JSON.stringify({ 1: conteudo }),
      });
    } catch (error) {
      // Notificação é acessório: falhar aqui não pode derrubar a operação de
      // negócio que a disparou (pedido criado, entrega aceita, etc.).
      const twilioCode = (error as { code?: number })?.code;

      this.logger.error(
        `Falha ao enviar notificação via WhatsApp pelo Twilio. code=${twilioCode ?? 'n/d'}: ${
          error instanceof Error ? error.message : error
        }`,
      );
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
