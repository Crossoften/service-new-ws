import { Injectable, Logger } from '@nestjs/common';

import { SmsService } from '../sms/sms.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

export interface SendCodeOptions {
  /**
   * Força o SMS, pulando o WhatsApp.
   *
   * É o escape do usuário que não tem WhatsApp: a API do Twilio aceita a
   * mensagem para qualquer número e só descobre depois, de forma assíncrona,
   * que o destinatário não está na plataforma. Não existe verificação prévia de
   * presença no WhatsApp, então o primeiro envio é sempre uma aposta. Quem
   * chama marca como reenvio a segunda tentativa e ela sai por SMS, que alcança
   * 100% dos números.
   */
  forceSms?: boolean;
}

/**
 * Entrega do código de verificação: WhatsApp primeiro, SMS no fallback.
 *
 * Concentrar a regra aqui evita repetir o try/catch nos três pontos do
 * `NoAuthService` que emitem código (cadastro, reenvio e recuperação de senha)
 * e deixa um lugar só para mudar a preferência de canal.
 */
@Injectable()
export class VerificationCodeService {
  private readonly logger = new Logger(VerificationCodeService.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Há canal para emitir código.
   *
   * Basta um dos dois: o SMS sozinho reproduz o comportamento anterior à
   * chegada do WhatsApp, e o WhatsApp sozinho ainda atende quem o tem.
   */
  hasCredentials(): boolean {
    return this.smsService.hasCredentials() || this.whatsappService.hasOtpCredentials();
  }

  async sendAccountVerificationCode(
    phone: string,
    code: string,
    options?: SendCodeOptions,
  ): Promise<void> {
    await this.send(
      phone,
      code,
      () => this.smsService.sendAccountVerificationCode(phone, code),
      options,
    );
  }

  async sendPasswordResetCode(
    phone: string,
    code: string,
    options?: SendCodeOptions,
  ): Promise<void> {
    await this.send(phone, code, () => this.smsService.sendPasswordResetCode(phone, code), options);
  }

  /**
   * O WhatsApp é tentado primeiro por custo; o SMS é a rede de segurança.
   *
   * A falha do WhatsApp é registrada mas não sobe: o usuário não tem nada a ver
   * com o canal que a plataforma escolheu, e a requisição ainda pode terminar
   * bem pelo SMS. Se o SMS também falhar, aí sim a exceção dele sobe — é a
   * mesma que subia antes desta fase existir, e os chamadores já contam com ela
   * para não gravar código que nunca saiu.
   */
  private async send(
    phone: string,
    code: string,
    sendSms: () => Promise<void>,
    options?: SendCodeOptions,
  ): Promise<void> {
    // O `forceSms` só vale se houver SMS para forçar. Sem essa guarda, uma
    // instalação configurada apenas com WhatsApp quebraria justamente no
    // reenvio — o pedido de socorro de quem não recebeu o primeiro código.
    const preferirSms = options?.forceSms && this.smsService.hasCredentials();

    if (!preferirSms && this.whatsappService.hasOtpCredentials()) {
      try {
        await this.whatsappService.sendVerificationCode(phone, code);

        return;
      } catch (error) {
        this.logger.warn(
          `WhatsApp recusou o código de verificação; caindo para SMS: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    await sendSms();
  }
}
