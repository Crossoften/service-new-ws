import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { PaymentMethodEnum } from '../works/enums/payment-method.enum';
import { SellerNotLinkedMercadoPagoException } from './exceptions/seller-not-linked-mercado-pago.exception';

export interface CreatePreferenceParams {
  title: string;
  unitPrice: number;
  externalReference: string;
  payerEmail?: string;
  sellerMpUserId?: string;
  sellerAccessToken?: string;
  applyMarketplaceSplit?: boolean;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  checkoutUrl: string;
  marketplaceFee?: number;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number | string;
  refresh_token: string;
  public_key?: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly client: MercadoPagoConfig | null;
  private readonly webhookSecret: string | undefined;
  private readonly notificationUrl: string | undefined;
  private readonly frontendUrl: string | undefined;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly redirectUri: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');

    this.client = accessToken ? new MercadoPagoConfig({ accessToken }) : null;
    this.webhookSecret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    this.notificationUrl = this.configService.get<string>('URL_INTEGRATION');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL');
    this.clientId = this.configService.get<string>('MERCADOPAGO_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('MERCADOPAGO_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('MERCADOPAGO_REDIRECT_URI');
  }

  private ensureConfigured(): MercadoPagoConfig {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Integração com Mercado Pago não configurada. Defina MERCADOPAGO_ACCESS_TOKEN no .env.',
      );
    }

    return this.client;
  }

  verifySellerLinked(seller: { mpUserId?: string | null; mpAccessToken?: string | null }): void {
    if (!seller || (!seller.mpUserId && !seller.mpAccessToken)) {
      throw new SellerNotLinkedMercadoPagoException();
    }
  }

  getConnectUrl(customRedirectUri?: string): string {
    const appId = this.clientId;
    if (!appId) {
      throw new ServiceUnavailableException(
        'MERCADOPAGO_CLIENT_ID não configurado nas variáveis de ambiente.',
      );
    }

    const redirect = customRedirectUri || this.redirectUri;
    if (!redirect) {
      throw new ServiceUnavailableException(
        'MERCADOPAGO_REDIRECT_URI não configurado nas variáveis de ambiente.',
      );
    }

    const encodedRedirect = encodeURIComponent(redirect);
    return `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=mp&redirect_uri=${encodedRedirect}`;
  }

  async exchangeCodeForToken(code: string, customRedirectUri?: string): Promise<OAuthTokenResponse> {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'Credenciais OAuth do Mercado Pago (CLIENT_ID / CLIENT_SECRET) não configuradas.',
      );
    }

    const redirect = customRedirectUri || this.redirectUri;
    if (!redirect) {
      throw new ServiceUnavailableException(
        'MERCADOPAGO_REDIRECT_URI não configurado nas variáveis de ambiente.',
      );
    }

    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Erro na troca de código OAuth com Mercado Pago: ${errorText}`);
      throw new ServiceUnavailableException(
        'Não foi possível concluir a integração com a conta do Mercado Pago.',
      );
    }

    const data = (await response.json()) as OAuthTokenResponse;
    return data;
  }

  async createPreference(params: CreatePreferenceParams): Promise<CreatePreferenceResult> {
    const mpClient = params.sellerAccessToken
      ? new MercadoPagoConfig({ accessToken: params.sellerAccessToken })
      : this.ensureConfigured();
    const preference = new Preference(mpClient);

    const backUrls =
      this.frontendUrl && this.notificationUrl
        ? {
            success: `${this.frontendUrl}/pagamento/sucesso`,
            failure: `${this.frontendUrl}/pagamento/falha`,
            pending: `${this.frontendUrl}/pagamento/pendente`,
          }
        : undefined;

    // Hardcoded 10% marketplace fee for automatic split
    const isSplit =
      params.applyMarketplaceSplit !== false && (!!params.sellerMpUserId || !!params.sellerAccessToken);
    const marketplaceFee = isSplit ? Number((params.unitPrice * 0.10).toFixed(2)) : undefined;

    const body: Record<string, any> = {
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
    };

    if (marketplaceFee !== undefined) {
      body.marketplace_fee = marketplaceFee;
    }

    const result = await preference.create({ body: body as any });

    return {
      preferenceId: result.id,
      checkoutUrl: result.init_point,
      marketplaceFee,
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
    if (!this.webhookSecret || !xSignature) {
      return true;
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

    return expectedHash === receivedHash;
  }

  mapPaymentMethod(paymentTypeId?: string, paymentMethodId?: string): PaymentMethodEnum | null {
    if (paymentMethodId === 'pix') return PaymentMethodEnum.Pix;
    if (paymentTypeId === 'ticket') return PaymentMethodEnum.BankSlip;
    if (paymentTypeId === 'credit_card' || paymentTypeId === 'debit_card') {
      return PaymentMethodEnum.CreditCard;
    }

    return null;
  }
}
