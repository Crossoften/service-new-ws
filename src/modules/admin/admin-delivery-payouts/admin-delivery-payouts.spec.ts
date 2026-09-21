import { PrismaService } from '@database/PrismaService';
import {
  DeliveryPayoutMethodEnum,
  FinancialTransactionCategoryEnum,
  FinancialTransactionTypeEnum,
  PaymentReferenceTypeEnum,
  Prisma,
} from '@prisma/client';

import { NotificationsService } from '../../notifications/notifications.service';
import { AdminDeliveryPayoutsService } from './admin-delivery-payouts.service';
import { DeliveryPayoutAmountChangedException } from './exceptions/delivery-payout-amount-changed.exception';
import { DeliveryPayoutConcurrentException } from './exceptions/delivery-payout-concurrent.exception';
import { DeliveryPayoutNothingToSettleException } from './exceptions/delivery-payout-nothing-to-settle.exception';

const ADMIN = 1;
const ENTREGADOR = 42;

const dec = (v: string) => new Prisma.Decimal(v);

interface Cenario {
  service: AdminDeliveryPayoutsService;
  buscarPendentes: jest.Mock;
  criarLote: jest.Mock;
  marcarQuitados: jest.Mock;
  criarLancamento: jest.Mock;
  avisar: jest.Mock;
}

function build(opcoes: {
  pendentes?: { id: number; amount: Prisma.Decimal }[];
  quitados?: number;
}): Cenario {
  const pendentes = opcoes.pendentes ?? [
    { id: 10, amount: dec('8.00') },
    { id: 11, amount: dec('10.50') },
  ];

  const buscarPendentes = jest.fn().mockResolvedValue(pendentes);
  const criarLancamento = jest.fn().mockResolvedValue({ id: 99 });
  const marcarQuitados = jest
    .fn()
    .mockResolvedValue({ count: opcoes.quitados ?? pendentes.length });

  const criarLote = jest.fn().mockImplementation(({ data }) =>
    Promise.resolve({
      id: 7,
      ...data,
      amount: data.amount,
      createdAt: new Date('2026-09-21T18:00:00Z'),
    }),
  );

  const tx = {
    financialTransaction: {
      findMany: buscarPendentes,
      updateMany: marcarQuitados,
      create: criarLancamento,
    },
    deliveryPayout: { create: criarLote },
  };

  const prisma = {
    $transaction: (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
  } as unknown as PrismaService;

  const avisar = jest.fn().mockResolvedValue(undefined);
  const notifications = { notifyUser: avisar } as unknown as NotificationsService;

  return {
    service: new AdminDeliveryPayoutsService(prisma, notifications),
    buscarPendentes,
    criarLote,
    marcarQuitados,
    criarLancamento,
    avisar,
  };
}

describe('AdminDeliveryPayoutsService.create', () => {
  it('soma todo o saldo em aberto no lote', async () => {
    const { service, criarLote } = build({});

    await service.create(ADMIN, {
      courierId: ENTREGADOR,
      method: DeliveryPayoutMethodEnum.Pix,
    });

    expect(criarLote.mock.calls[0][0].data.amount.toFixed(2)).toBe('18.50');
    expect(criarLote.mock.calls[0][0].data.transactionsCount).toBe(2);
    expect(criarLote.mock.calls[0][0].data.createdById).toBe(ADMIN);
  });

  it('recusa quando não há nada a repassar', async () => {
    const { service, criarLote } = build({ pendentes: [] });

    await expect(
      service.create(ADMIN, { courierId: ENTREGADOR, method: DeliveryPayoutMethodEnum.Pix }),
    ).rejects.toBeInstanceOf(DeliveryPayoutNothingToSettleException);

    expect(criarLote).not.toHaveBeenCalled();
  });

  it('recusa quando o saldo mudou desde que a tela carregou', async () => {
    const { service, criarLote } = build({});

    await expect(
      service.create(ADMIN, {
        courierId: ENTREGADOR,
        method: DeliveryPayoutMethodEnum.Pix,
        expectedAmount: 10.5,
      }),
    ).rejects.toBeInstanceOf(DeliveryPayoutAmountChangedException);

    expect(criarLote).not.toHaveBeenCalled();
  });

  it('segue quando o valor esperado confere', async () => {
    const { service, criarLote } = build({});

    await service.create(ADMIN, {
      courierId: ENTREGADOR,
      method: DeliveryPayoutMethodEnum.Pix,
      expectedAmount: 18.5,
    });

    expect(criarLote).toHaveBeenCalledTimes(1);
  });

  it('só quita crédito ainda em aberto', async () => {
    const { service, marcarQuitados } = build({});

    await service.create(ADMIN, {
      courierId: ENTREGADOR,
      method: DeliveryPayoutMethodEnum.Pix,
    });

    const { where, data } = marcarQuitados.mock.calls[0][0];
    expect(where.payoutId).toBeNull();
    expect(where.id).toEqual({ in: [10, 11] });
    expect(data.payoutId).toBe(7);
  });

  it('aborta quando outro repasse quitou parte dos créditos no intervalo', async () => {
    // O UPDATE alcançou menos linhas do que o esperado: alguém liquidou junto.
    // Melhor o admin repetir do que o entregador receber duas vezes.
    const { service } = build({ quitados: 1 });

    await expect(
      service.create(ADMIN, { courierId: ENTREGADOR, method: DeliveryPayoutMethodEnum.Pix }),
    ).rejects.toBeInstanceOf(DeliveryPayoutConcurrentException);
  });

  it('grava a saída no razão, com o mesmo valor do lote', async () => {
    const { service, criarLancamento } = build({});

    await service.create(ADMIN, {
      courierId: ENTREGADOR,
      method: DeliveryPayoutMethodEnum.Pix,
    });

    const { data } = criarLancamento.mock.calls[0][0];
    expect(data.type).toBe(FinancialTransactionTypeEnum.Debit);
    expect(data.category).toBe(FinancialTransactionCategoryEnum.Withdrawal);
    expect(data.referenceType).toBe(PaymentReferenceTypeEnum.DeliveryPayout);
    expect(data.referenceId).toBe(7);
    expect(data.userId).toBe(ENTREGADOR);
    expect(data.amount.toFixed(2)).toBe('18.50');
  });

  it('limpa comprovante e observação em branco', async () => {
    const { service, criarLote } = build({});

    await service.create(ADMIN, {
      courierId: ENTREGADOR,
      method: DeliveryPayoutMethodEnum.Cash,
      reference: '   ',
      notes: '',
    });

    expect(criarLote.mock.calls[0][0].data.reference).toBeNull();
    expect(criarLote.mock.calls[0][0].data.notes).toBeNull();
  });
});

describe('AdminDeliveryPayoutsService.create — aviso ao entregador', () => {
  it('avisa o entregador com o valor do repasse', async () => {
    const { service, avisar } = build({});

    await service.create(ADMIN, {
      courierId: ENTREGADOR,
      method: DeliveryPayoutMethodEnum.Pix,
    });

    expect(avisar).toHaveBeenCalledTimes(1);
    expect(avisar.mock.calls[0][0]).toBe(ENTREGADOR);
    expect(avisar.mock.calls[0][1]).toContain('18.50');
  });

  it('não avisa quando o repasse é recusado', async () => {
    const { service, avisar } = build({ pendentes: [] });

    await expect(
      service.create(ADMIN, { courierId: ENTREGADOR, method: DeliveryPayoutMethodEnum.Pix }),
    ).rejects.toThrow();

    expect(avisar).not.toHaveBeenCalled();
  });
});
