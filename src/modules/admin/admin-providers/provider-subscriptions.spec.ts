import { PrismaService } from '@database/PrismaService';
import { NotFoundException } from '@nestjs/common';
import { Prisma, SubscriptionIntervalEnum, SubscriptionStatusEnum } from '@prisma/client';

import { AdminProvidersService } from './admin-providers.service';

const FORNECEDOR = 7;

const PASSADO = new Date('2020-01-01T00:00:00Z');
const FUTURO = new Date('2099-01-01T00:00:00Z');

type LinhaParcial = {
  id: number;
  status?: SubscriptionStatusEnum;
  categoryId?: number | null;
  categoryName?: string | null;
  currentPeriodEnd?: Date | null;
  amount?: string;
  grantedById?: number | null;
  grantReason?: string | null;
  bonusMonths?: number;
};

function linha(parcial: LinhaParcial) {
  const categoryId = parcial.categoryId ?? null;

  return {
    id: parcial.id,
    planId: 2,
    planName: 'Plano Mensal',
    planInterval: SubscriptionIntervalEnum.Month,
    intervalCount: 1,
    amount: new Prisma.Decimal(parcial.amount ?? '49.90'),
    status: parcial.status ?? SubscriptionStatusEnum.Active,
    categoryId,
    category: categoryId === null ? null : { name: parcial.categoryName ?? 'Pintura' },
    grantedById: parcial.grantedById ?? null,
    grantReason: parcial.grantReason ?? null,
    bonusMonths: parcial.bonusMonths ?? 0,
    cancelAtPeriodEnd: false,
    startedAt: PASSADO,
    currentPeriodStart: PASSADO,
    currentPeriodEnd: parcial.currentPeriodEnd === undefined ? FUTURO : parcial.currentPeriodEnd,
    createdAt: PASSADO,
  };
}

function build(opcoes: { fornecedorExiste?: boolean; linhas?: ReturnType<typeof linha>[] }) {
  const buscarFornecedor = jest
    .fn()
    .mockResolvedValue(opcoes.fornecedorExiste === false ? null : { id: FORNECEDOR });
  const buscarAssinaturas = jest.fn().mockResolvedValue(opcoes.linhas ?? []);

  const prisma = {
    user: { findUnique: buscarFornecedor },
    subscription: { findMany: buscarAssinaturas },
  } as unknown as PrismaService;

  return { service: new AdminProvidersService(prisma), buscarAssinaturas };
}

describe('AdminProvidersService.findSubscriptions', () => {
  it('recusa fornecedor inexistente', async () => {
    const { service } = build({ fornecedorExiste: false });

    await expect(service.findSubscriptions(FORNECEDOR)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aponta a concessão vigente em activeGrantId', async () => {
    const { service } = build({ linhas: [linha({ id: 12, categoryId: null, grantedById: 1 })] });

    const resposta = await service.findSubscriptions(FORNECEDOR);

    expect(resposta.activeGrantId).toBe(12);
    expect(resposta.providerId).toBe(FORNECEDOR);
  });

  it('não aponta concessão já vencida', async () => {
    const { service } = build({
      linhas: [linha({ id: 12, categoryId: null, currentPeriodEnd: PASSADO })],
    });

    const resposta = await service.findSubscriptions(FORNECEDOR);

    expect(resposta.activeGrantId).toBeUndefined();
    expect(resposta.subscriptions[0].isCurrent).toBe(false);
  });

  // O conflito da rota de concessão olha só para `categoryId` nulo. Uma assinatura
  // paga de categoria vigente não bloqueia a cortesia, então também não pode
  // aparecer aqui como concessão.
  it('não confunde assinatura paga de categoria com concessão', async () => {
    const { service } = build({ linhas: [linha({ id: 30, categoryId: 4 })] });

    const resposta = await service.findSubscriptions(FORNECEDOR);

    expect(resposta.activeGrantId).toBeUndefined();
    expect(resposta.subscriptions[0].isCurrent).toBe(true);
    expect(resposta.subscriptions[0].categoryId).toBe(4);
    expect(resposta.subscriptions[0].categoryName).toBe('Pintura');
  });

  it('trata validade aberta como vigente', async () => {
    const { service } = build({
      linhas: [linha({ id: 12, categoryId: null, currentPeriodEnd: null })],
    });

    const resposta = await service.findSubscriptions(FORNECEDOR);

    expect(resposta.activeGrantId).toBe(12);
    expect(resposta.subscriptions[0].currentPeriodEnd).toBeUndefined();
  });

  it('não considera vigente quem está dentro da validade mas não está ativa', async () => {
    const { service } = build({
      linhas: [
        linha({ id: 12, categoryId: null, status: SubscriptionStatusEnum.Cancelled }),
        linha({ id: 13, categoryId: null, status: SubscriptionStatusEnum.Pending }),
        linha({ id: 14, categoryId: null, status: SubscriptionStatusEnum.Expired }),
      ],
    });

    const resposta = await service.findSubscriptions(FORNECEDOR);

    expect(resposta.activeGrantId).toBeUndefined();
    expect(resposta.subscriptions.map((s) => s.isCurrent)).toEqual([false, false, false]);
  });

  it('entrega amount como número e achata concessão e categoria', async () => {
    const { service } = build({
      linhas: [
        linha({
          id: 12,
          categoryId: null,
          amount: '0',
          grantedById: 1,
          grantReason: 'Cortesia comercial',
          bonusMonths: 3,
        }),
      ],
    });

    const [assinatura] = (await service.findSubscriptions(FORNECEDOR)).subscriptions;

    expect(assinatura.amount).toBe(0);
    expect(typeof assinatura.amount).toBe('number');
    expect(assinatura.isGranted).toBe(true);
    expect(assinatura.grantedById).toBe(1);
    expect(assinatura.grantReason).toBe('Cortesia comercial');
    expect(assinatura.bonusMonths).toBe(3);
    expect(assinatura.categoryId).toBeUndefined();
    expect(assinatura.categoryName).toBeUndefined();
  });

  it('marca como não concedida a assinatura paga', async () => {
    const { service } = build({ linhas: [linha({ id: 30, categoryId: 4, grantedById: null })] });

    const [assinatura] = (await service.findSubscriptions(FORNECEDOR)).subscriptions;

    expect(assinatura.isGranted).toBe(false);
    expect(assinatura.grantedById).toBeUndefined();
  });

  it('busca apenas as assinaturas do fornecedor pedido', async () => {
    const { service, buscarAssinaturas } = build({ linhas: [] });

    await service.findSubscriptions(FORNECEDOR);

    expect(buscarAssinaturas.mock.calls[0][0].where).toEqual({ userId: FORNECEDOR });
  });
});
