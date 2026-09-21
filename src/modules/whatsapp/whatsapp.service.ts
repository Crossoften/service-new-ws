import { PrismaService } from '@database/PrismaService';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
  private readonly otpContentSid: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_FROM');
    this.contentSid = this.configService.get<string>('TWILIO_WHATSAPP_CONTENT_SID');
    this.otpContentSid = this.configService.get<string>('TWILIO_WHATSAPP_OTP_CONTENT_SID');

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

  /**
   * O código de verificação sai por uma Content Template separada, de categoria
   * Authentication.
   *
   * A Meta proíbe mandar OTP por template Utility — que é o caso da usada em
   * `sendMessage`. O castigo não é o envio falhar na hora: é o template ser
   * pausado depois e a nota de qualidade do número cair, degradando todas as
   * mensagens, inclusive as de pedido. Por isso são dois SIDs, e a ausência de
   * um não desabilita o outro.
   */
  hasOtpCredentials(): boolean {
    return Boolean(this.client && this.fromNumber && this.otpContentSid);
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

  /**
   * Envia o código de verificação de cadastro ou de recuperação de senha.
   *
   * Ao contrário do `sendMessage`, este método **propaga** a falha. Notificação
   * de pedido é acessório e pode ser engolida; código de verificação é o
   * próprio fluxo — engolir o erro deixaria o usuário esperando um código que
   * nunca chega, sem caminho de volta. Quem chama usa a exceção para cair no
   * SMS na mesma requisição.
   *
   * O template Authentication recebe só o código na variável 1: o texto em
   * volta é fixo, definido pela Meta, e não passa por aqui.
   *
   * ⚠️ Esta exceção cobre apenas a falha **síncrona** (credencial recusada,
   * template inválido, destino em formato inaceitável, Twilio fora). Número que
   * simplesmente não tem WhatsApp é aceito pela API e só falha depois, de forma
   * assíncrona — esse caso é coberto pela regra de reenvio por SMS no
   * `VerificationCodeService`, não aqui.
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    if (!this.hasOtpCredentials()) {
      throw new InternalServerErrorException(
        'WhatsApp não configurado para código de verificação.',
      );
    }

    const to = this.toWhatsappAddress(phone);

    if (!to) {
      throw new InternalServerErrorException(
        'Número de telefone inválido para o código de verificação via WhatsApp.',
      );
    }

    await this.client.messages.create({
      from: this.fromNumber,
      to,
      contentSid: this.otpContentSid,
      contentVariables: JSON.stringify({ 1: code }),
    });
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
