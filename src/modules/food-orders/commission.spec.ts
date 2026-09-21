import { BillingTypeEnum, Prisma } from '@prisma/client';

import { DEFAULT_COMMISSION_RATE, calculateCommission, resolveCommissionRate } from './commission';

const dec = (valor: string | number) => new Prisma.Decimal(valor);

describe('resolveCommissionRate', () => {
  it('não cobra comissão de quem opera por assinatura', () => {
    expect(
      resolveCommissionRate({
        billingType: BillingTypeEnum.Subscription,
        deliveryCommissionRate: dec(15),
      }),
    ).toBeNull();
  });

  it('não cobra comissão sem modelo de cobrança definido', () => {
    expect(resolveCommissionRate({ billingType: null, deliveryCommissionRate: null })).toBeNull();
    expect(resolveCommissionRate(null)).toBeNull();
    expect(resolveCommissionRate(undefined)).toBeNull();
  });

  it('usa o padrão quando o dono não tem taxa própria', () => {
    expect(
      resolveCommissionRate({
        billingType: BillingTypeEnum.Commission,
        deliveryCommissionRate: null,
      }),
    ).toBe(DEFAULT_COMMISSION_RATE);
  });

  it('usa a taxa própria quando existe', () => {
    expect(
      resolveCommissionRate({
        billingType: BillingTypeEnum.Commission,
        deliveryCommissionRate: dec('12.5'),
      }),
    ).toBe(12.5);
  });

  it('distingue ausência de comissão de comissão zero', () => {
    // Taxa 0 gravada é uma decisão do admin — "este restaurante não paga
    // comissão" — e vale como 0%, não cai no padrão de 20%. É o comportamento
    // que já existia antes da separação dos campos, preservado de propósito:
    // esta fase corrige a colisão de domínios, não muda regra de negócio.
    expect(
      resolveCommissionRate({
        billingType: BillingTypeEnum.Commission,
        deliveryCommissionRate: dec(0),
      }),
    ).toBe(0);

    // Já `null` no billingType é outra coisa: não opera por comissão nenhuma,
    // e o pedido nem grava `platformFeeRate`.
    expect(
      resolveCommissionRate({
        billingType: BillingTypeEnum.Subscription,
        deliveryCommissionRate: dec(0),
      }),
    ).toBeNull();
  });
});

describe('calculateCommission', () => {
  it('cobra sobre os itens, com duas casas', () => {
    expect(calculateCommission(dec('100.00'), 20).toFixed(2)).toBe('20.00');
    expect(calculateCommission(dec('33.33'), 15).toFixed(2)).toBe('5.00');
  });

  it('arredonda em vez de truncar', () => {
    // 10,05 * 15% = 1,5075 → 1,51
    expect(calculateCommission(dec('10.05'), 15).toFixed(2)).toBe('1.51');
  });

  it('devolve zero para pedido sem valor', () => {
    expect(calculateCommission(dec(0), 20).toFixed(2)).toBe('0.00');
  });
});
