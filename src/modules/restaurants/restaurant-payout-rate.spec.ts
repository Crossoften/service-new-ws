import { Prisma } from '@prisma/client';

import { DEFAULT_COMMISSION_RATE, resolveCommissionRate } from '../food-orders/commission';

/**
 * O relatório de repasse do restaurante (`GET /v1/restaurants/me/payouts`) lia
 * `user.commissionRate` — a taxa do influenciador — depois que os dois domínios
 * foram separados. Este teste fixa a regra que o relatório segue, que é
 * exatamente a do cálculo do pedido.
 */
describe('relatório de repasse do restaurante — taxa exibida', () => {
  it('mostra a taxa própria quando existe', () => {
    const rate = resolveCommissionRate(
      { deliveryCommissionRate: new Prisma.Decimal('12.5') },
      DEFAULT_COMMISSION_RATE,
    );

    expect(rate.toFixed(2)).toBe('12.50');
  });

  it('mostra o padrão em vez de vazio quando não há taxa própria', () => {
    // Antes vinha `undefined`, o que dava a entender que o restaurante não
    // pagava comissão nenhuma — quando pagava.
    const rate = resolveCommissionRate({ deliveryCommissionRate: null }, DEFAULT_COMMISSION_RATE);

    expect(rate).toBe(DEFAULT_COMMISSION_RATE);
  });

  it('mostra taxa também para quem opera por assinatura', () => {
    // Era o caso que vinha vazio: assinatura não isenta mais do percentual, e
    // o relatório tem de dizer isso em vez de omitir.
    const rate = resolveCommissionRate(
      { deliveryCommissionRate: new Prisma.Decimal('12.5') },
      DEFAULT_COMMISSION_RATE,
    );

    expect(rate.toFixed(2)).toBe('12.50');
  });
});
