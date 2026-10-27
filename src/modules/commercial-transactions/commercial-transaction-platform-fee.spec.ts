import { PrismaService } from '@database/PrismaService';
import { User } from '@prisma/client';

import { MercadoPagoAccountsService } from '../mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CommercialTransactionsService } from './commercial-transactions.service';
import { CommercialTransactionStatusEnum } from './enums/commercial-transaction-status.enum';

const COMPRADOR = { id: 1 } as User;

function build() {
  const criarPagamento = jest.fn().mockResolvedValue({ id: 70 });

  const prisma = {
    commercialTransaction: {
      findUnique: jest.fn().mockResolvedValue({
        id: 8,
        buyerId: COMPRADOR.id,
        sellerId: 2,
        status: CommercialTransactionStatusEnum.Accepted,
        requestedAmount: 500,
        agreedAmount: 400,
        seller: { id: 2, mpUserId: 'MP1', mpAccessToken: 'cifrado' },
      }),
    },
    payment: { findFirst: jest.fn().mockResolvedValue(null), create: criarPagamento },
  } as unknown as PrismaService;

  const mercadoPago = {
    verifySellerLinked: jest.fn(),
    createPreference: jest
      .fn()
      .mockResolvedValue({ preferenceId: 'PREF', checkoutUrl: 'https://mp' }),
  } as unknown as MercadoPagoService;

  const contas = {
    accessTokenFor: jest.fn().mockResolvedValue('token'),
  } as unknown as MercadoPagoAccountsService;

  const service = new CommercialTransactionsService(
    prisma,
    mercadoPago,
    contas,
    { notifyUser: jest.fn() } as unknown as NotificationsService,
    {} as SubscriptionGuardService,
  );

  // `pay()` recarrega a negociação no fim para montar a resposta; não é o que
  // está sob teste.
  jest.spyOn(service, 'findById').mockResolvedValue({ id: 8 } as never);

  return { service, mercadoPago, criarPagamento };
}

describe('commercialTransactions.pay — retenção da plataforma', () => {
  // Regra do produto: o fornecedor paga assinatura e só o delivery tem
  // percentual além dela. Negociação de produto, como trabalho, não retém.
  it('não pede retenção da plataforma na preferência', async () => {
    const { service, mercadoPago } = build();

    await service.pay(COMPRADOR, 8, {});

    const params = jest.mocked(mercadoPago.createPreference).mock.calls[0][0];
    expect(params).not.toHaveProperty('marketplaceFeeRate');
    expect(params).not.toHaveProperty('marketplaceFeeAmount');
  });

  it('não registra valor retido no pagamento', async () => {
    const { service, criarPagamento } = build();

    await service.pay(COMPRADOR, 8, {});

    expect(criarPagamento.mock.calls[0][0].data.platformFeeAmount).toBeNull();
  });

  it('manda o valor cheio da negociação para o vendedor', async () => {
    const { service, mercadoPago } = build();

    await service.pay(COMPRADOR, 8, {});

    const params = jest.mocked(mercadoPago.createPreference).mock.calls[0][0];
    expect(params.unitPrice).toBe(400);
    expect(params.sellerAccessToken).toBe('token');
  });
});
