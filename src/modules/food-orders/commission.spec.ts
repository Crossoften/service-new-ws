import { Prisma } from '@prisma/client';

import { DEFAULT_COMMISSION_RATE, calculateCommission, resolveCommissionRate } from './commission';

const dec = (valor: string | number) => new Prisma.Decimal(valor);
const DO_PAINEL = 15;

describe('resolveCommissionRate', () => {
  it('cobra de todo mundo que opera delivery, sem condicional de modelo', () => {
    // Era aqui que estava a exceção: quem não fosse `Commission` recebia
    // `null`, pagava a assinatura e nada além. A regra passou a ser a soma.
    expect(resolveCommissionRate({ deliveryCommissionRate: null }, DO_PAINEL)).toBe(DO_PAINEL);
  });

  it('usa a taxa própria do dono quando existe', () => {
    expect(resolveCommissionRate({ deliveryCommissionRate: dec('12.5') }, DO_PAINEL)).toBe(12.5);
  });

  it('cai na taxa do painel quando o dono não tem taxa própria', () => {
    expect(resolveCommissionRate({ deliveryCommissionRate: null }, DO_PAINEL)).toBe(DO_PAINEL);
    expect(resolveCommissionRate(null, DO_PAINEL)).toBe(DO_PAINEL);
    expect(resolveCommissionRate(undefined, DO_PAINEL)).toBe(DO_PAINEL);
  });

  it('trata taxa própria de 0% como 0%, não como ausência', () => {
    // Decisão do admin — "este restaurante não paga comissão" — e é diferente
    // de não ter taxa cadastrada. Um `||` no lugar do `??` cairia no padrão.
    expect(resolveCommissionRate({ deliveryCommissionRate: dec(0) }, DO_PAINEL)).toBe(0);
  });

  it('a constante é último recurso, não a taxa em uso', () => {
    // O valor que vale é o do painel. A constante só aparece quando quem chama
    // não tem resposta do painel para passar.
    expect(resolveCommissionRate({ deliveryCommissionRate: null }, DEFAULT_COMMISSION_RATE)).toBe(
      DEFAULT_COMMISSION_RATE,
    );
    expect(DO_PAINEL).not.toBe(DEFAULT_COMMISSION_RATE);
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
