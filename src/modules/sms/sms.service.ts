import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio = require('twilio');

@Injectable()
export class SmsService {
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

    await this.client.messages.create({
      body,
      from: this.fromNumber,
      to: phone,
    });
  }

  hasCredentials(): boolean {
    return Boolean(this.client && this.fromNumber);
  }
}
