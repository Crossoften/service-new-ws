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

    this.client = accountSid && authToken ? Twilio(accountSid, authToken) : null;
  }

  async sendPasswordResetCode(phone: string, code: string): Promise<void> {
    if (!this.client) {
      throw new InternalServerErrorException('Credenciais do Twilio não configuradas.');
    }

    const body = `Você solicitou recuperação de senha. Seu código é: ${code}. Válido por 4 horas.`;

    await this.client.messages.create({
      body,
      from: this.fromNumber,
      to: phone,
    });
  }
}
