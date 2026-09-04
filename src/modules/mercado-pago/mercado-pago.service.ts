import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { decryptSecret, encryptSecret } from '@utils/secretBox';
import { PaymentMethodEnum } from '../works/enums/payment-method.enum';
import { SellerNotLinkedMercadoPagoException } from './exceptions/seller-not-linked-mercado-pago.exception';

export interface CreatePreferenceParams {
  title: string;
  unitPrice: number;
  externalReference: string;
  payerEmail?: string;
  /** Token do vendedor, já decifrado. Presente, o checkout é criado na conta dele. */
  sellerAccessToken?: string;
  /** Percentual retido pela plataforma. Calculado por quem chama, nunca fixo aqui. */
  marketplaceFeeRate?: number;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  checkoutUrl: string;
  /** Valor em reais retido pela plataforma, quando houve split. */
  marketplaceFee?: number;
}

export interface SellerLink {
  mpUserId: string;
  mpAccessToken: string;
  mpRefreshToken: string | null;
  mpPublicKey: string | null;
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  user_id: number | string;
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
  private readonly encryptionKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');

    this.client = accessToken ? new MercadoPagoConfig({ accessToken }) : null;
    this.webhookSecret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    this.notificationUrl = this.configService.get<string>('URL_INTEGRATION');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL');
    this.clientId = this.configService.get<string>('MERCADOPAGO_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('MERCADOPAGO_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('MERCADOPAGO_REDIRECT_URI');
    this.encryptionKey = this.configService.get<string>('MERCADOPAGO_TOKEN_ENCRYPTION_KEY');
  }

  /**
   * Confirma que o vendedor tem conta vinculada.
   *
   * Só deve ser chamado quando o pagamento de fato vai passar pelo Mercado
   * Pago. Exigir vínculo em venda que não usa gateway — pedido em dinheiro, por
   * exemplo — bloqueia negócio que não dependia dele.
   */
  verifySellerLinked(seller: { mpUserId?: string | null; mpAccessToken?: string | null }): void {
    if (!seller?.mpUserId || !seller?.mpAccessToken) {
      throw new SellerNotLinkedMercadoPagoException();
    }
  }

  /**
   * URL para onde o vendedor é mandado para autorizar a plataforma.
   */
  getConnectUrl(customRedirectUri?: string): string {
    if (!this.clientId) {
      throw new ServiceUnavailableException(
        'MERCADOPAGO_CLIENT_ID não configurado. A vinculação de contas está indisponível.',
      );
    }

    const redirect = customRedirectUri || this.redirectUri;

    if (!redirect) {
      throw new ServiceUnavailableException(
        'MERCADOPAGO_REDIRECT_URI não configurado. A vinculação de contas está indisponível.',
      );
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      platform_id: 'mp',
      redirect_uri: redirect,
    });

    return `https://auth.mercadopago.com.br/authorization?${params.toString()}`;
  }

  /**
   * Troca o código do OAuth pelos tokens do vendedor.
   *
   * Devolve já cifrado: o chamador grava o que recebe, sem nunca decidir sobre
   * cifragem. Assim não existe caminho em que o token vá para o banco em claro
   * por esquecimento.
   */
  async exchangeCodeForSellerLink(code: string, customRedirectUri?: string): Promise<SellerLink> {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'Credenciais OAuth do Mercado Pago não configuradas (CLIENT_ID / CLIENT_SECRET).',
      );
    }

    const redirect = customRedirectUri || this.redirectUri;

    if (!redirect) {
      throw new ServiceUnavailableException('MERCADOPAGO_REDIRECT_URI não configurado.');
    }

    const data = await this.requestOAuthToken({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
    });

    return this.toSellerLink(data);
  }

  /**
   * Renova o vínculo a partir do refresh token.
   *
   * O token do Mercado Pago expira. Sem renovação, o vendedor para de receber
   * pagamentos em silêncio, e ninguém descobre até alguém reclamar de dinheiro
   * que não caiu.
   */
  async refreshSellerLink(encryptedRefreshToken: string): Promise<SellerLink> {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'Credenciais OAuth do Mercado Pago não configuradas (CLIENT_ID / CLIENT_SECRET).',
      );
    }

    const data = await this.requestOAuthToken({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.decryptToken(encryptedRefreshToken),
    });

    return this.toSellerLink(data);
  }

  /** Decifra um token guardado, para uso imediato numa chamada ao Mercado Pago. */
  decryptToken(guardado: string): string {
    return decryptSecret(guardado, this.encryptionKey);
  }

  private async requestOAuthToken(corpo: Record<string, string>): Promise<OAuthTokenResponse> {
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(corpo).toString(),
    });

    if (!response.ok) {
      // O corpo do erro pode conter o próprio code ou fragmentos do segredo,
      // por isso vai só para o log, e nunca para a resposta da API.
      this.logger.error(
        `Falha na negociação OAuth com o Mercado Pago (${response.status}): ${await response.text()}`,
      );

      throw new ServiceUnavailableException(
        'Não foi possível concluir a integração com a conta do Mercado Pago.',
      );
    }

    return (await response.json()) as OAuthTokenResponse;
  }

  private toSellerLink(data: OAuthTokenResponse): SellerLink {
    if (!data?.access_token || !data?.user_id) {
      throw new ServiceUnavailableException(
        'Resposta inesperada do Mercado Pago na vinculação da conta.',
      );
    }

    return {
      mpUserId: String(data.user_id),
      mpAccessToken: encryptSecret(data.access_token, this.encryptionKey),
      mpRefreshToken: data.refresh_token
        ? encryptSecret(data.refresh_token, this.encryptionKey)
        : null,
      mpPublicKey: data.public_key ?? null,
    };
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
    // Com token do vendedor, a preferência é criada na conta DELE e o Mercado
    // Pago divide o valor na origem. Sem token, cai na conta da plataforma —
    // que é o comportamento antigo, mantido para quem ainda não vinculou.
    const client = params.sellerAccessToken
      ? new MercadoPagoConfig({ accessToken: params.sellerAccessToken })
      : this.ensureConfigured();
    const preference = new Preference(client);

    // A taxa vem de quem chama, que a lê da configuração da plataforma ou da
    // categoria. Fixá-la aqui tornaria impossível cobrar diferente por
    // categoria, e mudar o percentual exigiria deploy.
    const marketplaceFee =
      params.sellerAccessToken && params.marketplaceFeeRate && params.marketplaceFeeRate > 0
        ? Number(((params.unitPrice * params.marketplaceFeeRate) / 100).toFixed(2))
        : undefined;

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
        ...(marketplaceFee !== undefined ? { marketplace_fee: marketplaceFee } : {}),
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
