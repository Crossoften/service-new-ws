import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { PaymentMethodEnum } from '../works/enums/payment-method.enum';

export interface CreatePreferenceParams {
  title: string;
  unitPrice: number;
  externalReference: string;
  payerEmail?: string;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  checkoutUrl: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly client: MercadoPagoConfig | null;
  private readonly webhookSecret: string | undefined;
  private readonly notificationUrl: string | undefined;
  private readonly frontendUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');

    this.client = accessToken ? new MercadoPagoConfig({ accessToken }) : null;
    this.webhookSecret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    this.notificationUrl = this.configService.get<string>('URL_INTEGRATION');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL');
  }

  private ensureConfigured(): MercadoPagoConfig {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Integração com Mercado Pago não configurada. Defina MERCADOPAGO_ACCESS_TOKEN no .env.',
      );
    }

    return this.client;
  }

  async createPreference(params: CreatePreferenceParams): Promise<CreatePreferenceResult> {
    const client = this.ensureConfigured();
    const preference = new Preference(client);

    const backUrls =
      this.frontendUrl && this.notificationUrl
        ? {
            success: `${this.frontendUrl}/pagamento/sucesso`,
            failure: `${this.frontendUrl}/pagamento/falha`,
            pending: `${this.frontendUrl}/pagamento/pendente`,
          }
        : undefined;

    const result = await preference.create({
      body: {
        items: [
          {
            id: params.externalReference,
            title: params.title,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: params.unitPrice,
          },
        ],
        external_reference: params.externalReference,
        notification_url: this.notificationUrl
          ? `${this.notificationUrl}/v1/webhooks/mercado-pago`
          : undefined,
        payer: params.payerEmail ? { email: params.payerEmail } : undefined,
        back_urls: backUrls,
        auto_return: backUrls ? 'approved' : undefined,
      },
    });

    return {
      preferenceId: result.id,
      checkoutUrl: result.init_point,
    };
  }

  async getPayment(paymentId: string) {
    const client = this.ensureConfigured();
    const payment = new Payment(client);

    return payment.get({ id: paymentId });
  }

  verifySignature(
    xSignature: string | undefined,
    xRequestId: string | undefined,
    dataId: string,
  ): boolean {
    // Sem segredo configurado (ambiente local), a verificação fica desligada.
    if (!this.webhookSecret) {
      return true;
    }

    // Com segredo configurado, falhamos FECHADO: antes, omitir o header
    // x-signature contornava a verificação por completo.
    if (!xSignature) {
      return false;
    }

    const parts = xSignature.split(',').reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});

    const ts = parts['ts'];
    const receivedHash = parts['v1'];

    if (!ts || !receivedHash) {
      return false;
    }

    const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`;
    const expectedHash = createHmac('sha256', this.webhookSecret).update(manifest).digest('hex');

    const expected = Buffer.from(expectedHash, 'utf8');
    const received = Buffer.from(receivedHash, 'utf8');

    // Comparação em tempo constante: `===` vaza, pelo tempo de resposta, quantos
    // caracteres do hash foram acertados.
    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  }

  mapPaymentMethod(paymentTypeId?: string, paymentMethodId?: string): PaymentMethodEnum | null {
    if (paymentMethodId === 'pix') return PaymentMethodEnum.Pix;
    if (paymentTypeId === 'ticket') return PaymentMethodEnum.BankSlip;
    // Débito e crédito são meios distintos e o Mercado Pago já os separa.
    // Dobrar os dois em CreditCard, como era feito aqui, impedia conciliar o
    // extrato e respondia errado a "quanto entrou no débito".
    if (paymentTypeId === 'debit_card') return PaymentMethodEnum.DebitCard;
    if (paymentTypeId === 'credit_card') return PaymentMethodEnum.CreditCard;

    return null;
  }
}
