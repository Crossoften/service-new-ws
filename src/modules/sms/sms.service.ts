import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio = require('twilio');

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: Twilio.Twilio | null;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    // O SDK do Twilio valida o formato do SID no construtor e lança erro se ele
    // não começar com "AC". Checar apenas se a variável tem valor deixa passar o
    // placeholder do .env.example e derruba o bootstrap da aplicação inteira.
    // Validando o formato, o serviço apenas fica desabilitado (client = null) e
    // quem chamar recebe o erro tratado por hasCredentials().
    this.client = accountSid?.startsWith('AC') && authToken ? Twilio(accountSid, authToken) : null;
  }

  async sendPasswordResetCode(phone: string, code: string): Promise<void> {
    if (!this.hasCredentials()) {
      throw new InternalServerErrorException('Credenciais do Twilio não configuradas.');
    }

    const body = `Você solicitou recuperação de senha. Seu código é: ${code}. Válido por 4 horas.`;

    try {
      await this.client.messages.create({
        body,
        from: this.fromNumber,
        to: phone,
      });
    } catch (error) {
      // Falha do Twilio é indisponibilidade de um serviço externo, não erro
      // interno: subia como 500 genérico, sem o código do erro em lugar nenhum.
      // O `code` numérico é o que identifica a causa no painel do Twilio
      // (21211 destino inválido, 21606 remetente não habilitado, 21612 rota
      // indisponível para o destino, 20003 credenciais recusadas).
      const twilioCode = (error as { code?: number })?.code;
      const twilioStatus = (error as { status?: number })?.status;

      this.logger.error(
        `Falha ao enviar SMS via Twilio. code=${twilioCode ?? 'n/d'} status=${twilioStatus ?? 'n/d'}: ${
          (error as Error)?.message ?? error
        }`,
      );

      throw new ServiceUnavailableException(
        'Não foi possível enviar o SMS no momento. Tente novamente ou use o e-mail.',
      );
    }
  }

  hasCredentials(): boolean {
    return Boolean(this.client && this.fromNumber);
  }
}
