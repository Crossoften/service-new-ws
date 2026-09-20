import { CouponTypeEnum, Prisma } from '@prisma/client';

import { calculateCouponDiscount, platformDiscountAllowance } from './coupon-discount';

const d = (v: string | number) => new Prisma.Decimal(v);
const ITENS = d('100.00');
const FRETE = d('8.00');

function desconto(
  tipo: CouponTypeEnum,
  value: string | null,
  maxDiscountValue: string | null = null,
  itens = ITENS,
  frete = FRETE,
): number {
  return Number(
    calculateCouponDiscount(
      {
        type: tipo,
        value: value === null ? null : d(value),
        maxDiscountValue: maxDiscountValue === null ? null : d(maxDiscountValue),
      },
      itens,
      frete,
    ),
  );
}

describe('calculateCouponDiscount', () => {
  it('percentual incide sobre os itens', () => {
    expect(desconto(CouponTypeEnum.Percent, '20')).toBe(20);
  });

  it('percentual respeita o teto em reais', () => {
    // "20% off, até R$ 15" num pedido de R$ 100 desconta 15, não 20.
    expect(desconto(CouponTypeEnum.Percent, '20', '15')).toBe(15);
  });

  it('percentual abaixo do teto não é afetado por ele', () => {
    expect(desconto(CouponTypeEnum.Percent, '10', '15')).toBe(10);
  });

  it('valor fixo desconta o valor', () => {
    expect(desconto(CouponTypeEnum.Fixed, '25')).toBe(25);
  });

  it('valor fixo nunca passa do valor dos itens', () => {
    // Cupom de R$ 50 num pedido de R$ 30 desconta 30 — o total não pode ficar
    // negativo, e o frete não é coberto por cupom de valor fixo.
    expect(desconto(CouponTypeEnum.Fixed, '50', null, d('30.00'))).toBe(30);
  });

  it('frete grátis desconta exatamente o frete', () => {
    expect(desconto(CouponTypeEnum.FreeShipping, null)).toBe(8);
  });

  it('frete grátis em pedido sem frete não desconta nada', () => {
    expect(desconto(CouponTypeEnum.FreeShipping, null, null, ITENS, d('0'))).toBe(0);
  });

  it('percentual e fixo NÃO tocam no frete', () => {
    // O frete é do entregador. Um cupom de 100% sobre itens de R$ 100 desconta
    // 100, não 108.
    expect(desconto(CouponTypeEnum.Percent, '100')).toBe(100);
  });

  it('cupom sem valor não desconta nada', () => {
    expect(desconto(CouponTypeEnum.Percent, null)).toBe(0);
    expect(desconto(CouponTypeEnum.Fixed, '0')).toBe(0);
  });

  it('valor negativo não vira acréscimo', () => {
    expect(desconto(CouponTypeEnum.Fixed, '-10')).toBe(0);
  });

  it('arredonda para duas casas', () => {
    // 33% de R$ 100 = 33.00; 33% de R$ 10,10 = 3.333 -> 3.33
    expect(desconto(CouponTypeEnum.Percent, '33', null, d('10.10'))).toBe(3.33);
  });
});

describe('platformDiscountAllowance', () => {
  it('o teto é a comissão do pedido', () => {
    expect(Number(platformDiscountAllowance(d('12.00')))).toBe(12);
  });

  it('sem comissão, não há de onde tirar desconto', () => {
    // Restaurante que fatura por assinatura: a retenção da plataforma cobre só
    // frete e gorjeta, que são do entregador.
    expect(Number(platformDiscountAllowance(null))).toBe(0);
    expect(Number(platformDiscountAllowance(d('0')))).toBe(0);
  });
});
