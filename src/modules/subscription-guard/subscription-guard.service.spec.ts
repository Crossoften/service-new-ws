import { PrismaService } from '@database/PrismaService';
import { BillingTypeEnum, User } from '@prisma/client';

import { SubscriptionStatusEnum } from '../plans/enums/subscription-status.enum';
import { ProviderNotSellingException } from './exceptions/provider-not-selling.exception';
import { SupplierSubscriptionRequiredException } from './exceptions/supplier-subscription-required.exception';
import { SubscriptionGuardService } from './subscription-guard.service';

const FORNECEDOR = 20;

function build(assinatura: { id: number } | null, billingType?: BillingTypeEnum) {
  const findFirst = jest.fn().mockResolvedValue(assinatura);
  const findUnique = jest.fn().mockResolvedValue(billingType ? { billingType } : null);

  const prisma = {
    subscription: { findFirst },
    user: { findUnique },
  } as unknown as PrismaService;

  return { service: new SubscriptionGuardService(prisma), findFirst, findUnique };
}

describe('SubscriptionGuardService.assertProviderCanSell', () => {
  it('deixa passar quando o fornecedor tem assinatura vigente', async () => {
    const { service } = build({ id: 1 });

    await expect(service.assertProviderCanSell(FORNECEDOR)).resolves.toBeUndefined();
  });

  it('barra quando não há assinatura vigente', async () => {
    const { service } = build(null);

    await expect(service.assertProviderCanSell(FORNECEDOR)).rejects.toBeInstanceOf(
      ProviderNotSellingException,
    );
  });

  it('responde 409, não 403: quem recebe o erro é o cliente, que não tem pendência', async () => {
    const { service } = build(null);

    await expect(service.assertProviderCanSell(FORNECEDOR)).rejects.toMatchObject({ status: 409 });
  });

  it('exige status Active e período em aberto na mesma consulta', async () => {
    const { service, findFirst } = build({ id: 1 });

    await service.assertProviderCanSell(FORNECEDOR);

    const where = findFirst.mock.calls[0][0].where;

    expect(where.userId).toBe(FORNECEDOR);
    expect(where.status).toBe(SubscriptionStatusEnum.Active);
    // A data é conferida na leitura porque `Expired` nunca é gravado por
    // rotina nenhuma: confiar só no status deixaria vencido passando.
    expect(where.OR).toEqual([
      { currentPeriodEnd: null },
      { currentPeriodEnd: { gte: expect.any(Date) } },
    ]);
  });

  it('libera quem fatura por comissão, quando a vertical permite', async () => {
    const { service, findFirst } = build(null, BillingTypeEnum.Commission);

    await expect(
      service.assertProviderCanSell(FORNECEDOR, { allowCommissionBilling: true }),
    ).resolves.toBeUndefined();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('não libera por comissão quando a vertical não permite', async () => {
    const { service } = build(null, BillingTypeEnum.Commission);

    await expect(service.assertProviderCanSell(FORNECEDOR)).rejects.toBeInstanceOf(
      ProviderNotSellingException,
    );
  });

  it('exige assinatura de quem fatura por assinatura, mesmo na vertical híbrida', async () => {
    const { service } = build(null, BillingTypeEnum.Subscription);

    await expect(
      service.assertProviderCanSell(FORNECEDOR, { allowCommissionBilling: true }),
    ).rejects.toBeInstanceOf(ProviderNotSellingException);
  });
});

describe('SubscriptionGuardService.assertActiveSubscription', () => {
  const fornecedor = { id: FORNECEDOR, billingType: BillingTypeEnum.Subscription } as User;

  it('continua barrando o próprio fornecedor com 403', async () => {
    const { service } = build(null);

    await expect(service.assertActiveSubscription(fornecedor)).rejects.toBeInstanceOf(
      SupplierSubscriptionRequiredException,
    );
  });

  it('continua liberando quem fatura por comissão na vertical híbrida', async () => {
    const { service, findFirst } = build(null);
    const comissionado = { id: FORNECEDOR, billingType: BillingTypeEnum.Commission } as User;

    await expect(
      service.assertActiveSubscription(comissionado, { allowCommissionBilling: true }),
    ).resolves.toBeUndefined();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
