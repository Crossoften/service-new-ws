import { PrismaService } from '@database/PrismaService';
import { User } from '@prisma/client';

import { MarketplaceFeeService } from '../mercado-pago/marketplace-fee.service';
import { MercadoPagoAccountsService } from '../mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatusEnum } from './enums/payment-status.enum';
import { WorkPaymentAlreadyRegisteredException } from './exceptions/work-payment-already-registered.exception';
import { WorksService } from './works.service';

const CLIENTE = { id: 1 } as User;

interface Cenario {
  service: WorksService;
  buscarPagamento: jest.Mock;
  criarPagamento: jest.Mock;
}

function build(pagamentoEmAberto: { id: number } | null): Cenario {
  const buscarPagamento = jest.fn().mockResolvedValue(pagamentoEmAberto);
  const criarPagamento = jest.fn().mockResolvedValue({ id: 10 });

  const prisma = {
    work: {
      findUnique: jest.fn().mockResolvedValue({
        id: 5,
        status: 'Finished',
        requesterId: CLIENTE.id,
        providerId: 2,
        totalValue: 300,
        serviceValue: 300,
        serviceId: 3,
        provider: { id: 2, mpUserId: 'MP1', mpAccessToken: 'cifrado' },
      }),
    },
    payment: { findFirst: buscarPagamento, create: criarPagamento },
  } as unknown as PrismaService;

  const mercadoPago = {
    verifySellerLinked: jest.fn(),
    createPreference: jest
      .fn()
      .mockResolvedValue({ preferenceId: 'PREF', checkoutUrl: 'https://mp', marketplaceFee: 30 }),
  } as unknown as MercadoPagoService;

  const contas = {
    accessTokenFor: jest.fn().mockResolvedValue('token'),
  } as unknown as MercadoPagoAccountsService;

  const taxa = {
    rateForService: jest.fn().mockResolvedValue(10),
  } as unknown as MarketplaceFeeService;
  const notificacoes = { notifyUser: jest.fn() } as unknown as NotificationsService;

  const service = new WorksService(prisma, mercadoPago, contas, taxa, notificacoes);

  // `pay()` recarrega o trabalho no fim para montar a resposta; não é o que
  // está sob teste, e modelar o select inteiro traria ruído sem ganho.
  jest.spyOn(service, 'findById').mockResolvedValue({ id: 5 } as never);

  return { service, buscarPagamento, criarPagamento };
}

describe('works.pay — quando um novo checkout é permitido', () => {
  it('recusa quando já existe pagamento em aberto', async () => {
    const { service, criarPagamento } = build({ id: 99 });

    await expect(service.pay(CLIENTE, 5, {})).rejects.toBeInstanceOf(
      WorkPaymentAlreadyRegisteredException,
    );
    expect(criarPagamento).not.toHaveBeenCalled();
  });

  it('só considera em aberto o que está Pending ou Paid', async () => {
    // A trava anterior não filtrava status: um pagamento recusado (Cancelled)
    // trancava o trabalho para sempre, sem rota para destravar.
    const { service, buscarPagamento } = build(null);

    await service.pay(CLIENTE, 5, {});

    expect(buscarPagamento.mock.calls[0][0].where.status).toEqual({
      in: [PaymentStatusEnum.Pending, PaymentStatusEnum.Paid],
    });
  });

  it('gera novo checkout quando o anterior foi recusado', async () => {
    const { service, criarPagamento } = build(null);

    const resultado = await service.pay(CLIENTE, 5, {});

    expect(criarPagamento).toHaveBeenCalledTimes(1);
    expect(resultado.checkoutUrl).toBe('https://mp');
  });
});
