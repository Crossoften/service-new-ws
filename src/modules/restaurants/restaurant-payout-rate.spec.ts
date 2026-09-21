import { BillingTypeEnum, Prisma } from '@prisma/client';

import { DEFAULT_COMMISSION_RATE, resolveCommissionRate } from '../food-orders/commission';

/**
 * O relatório de repasse do restaurante (`GET /v1/restaurants/me/payouts`) lia
 * `user.commissionRate` — a taxa do influenciador — depois que os dois domínios
 * foram separados. Este teste fixa a regra que o relatório passa a seguir, que
 * é exatamente a do cálculo do pedido.
 */
describe('relatório de repasse do restaurante — taxa exibida', () => {
  it('mostra a taxa própria quando existe', () => {
    const rate = resolveCommissionRate({
      billingType: BillingTypeEnum.Commission,
      deliveryCommissionRate: new Prisma.Decimal('12.5'),
    });

    expect(rate?.toFixed(2)).toBe('12.50');
  });

  it('mostra o padrão de 20% em vez de vazio quando não há taxa própria', () => {
    // Antes vinha `undefined`, o que dava a entender que o restaurante não
    // pagava comissão nenhuma — quando pagava 20%.
    const rate = resolveCommissionRate({
      billingType: BillingTypeEnum.Commission,
      deliveryCommissionRate: null,
    });

    expect(rate).toBe(DEFAULT_COMMISSION_RATE);
  });

  it('não mostra taxa para quem opera por assinatura', () => {
    expect(
      resolveCommissionRate({
        billingType: BillingTypeEnum.Subscription,
        deliveryCommissionRate: new Prisma.Decimal('12.5'),
      }),
    ).toBeNull();
  });
});
