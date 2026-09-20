import { CouponTypeEnum, Prisma } from '@prisma/client';

/**
 * O que o cálculo precisa saber do cupom. Um subconjunto do modelo, para a
 * função poder ser exercitada sem banco.
 */
export interface CouponRules {
  type: CouponTypeEnum;
  value: Prisma.Decimal | null;
  maxDiscountValue: Prisma.Decimal | null;
}

/**
 * Desconto que o cupom concede a um pedido.
 *
 * Só os itens e o frete entram na conta. **Gorjeta nunca é descontada**: é
 * dinheiro do entregador, e um cupom que a reduzisse estaria dando desconto
 * com o dinheiro dele.
 *
 * O resultado nunca passa do que há para descontar — um cupom de R$ 50 num
 * pedido de R$ 30 desconta R$ 30, não deixa o total negativo.
 */
export function calculateCouponDiscount(
  coupon: CouponRules,
  itemsValue: Prisma.Decimal,
  deliveryFee: Prisma.Decimal,
): Prisma.Decimal {
  const zero = new Prisma.Decimal(0);

  if (coupon.type === CouponTypeEnum.FreeShipping) {
    return deliveryFee.greaterThan(zero) ? deliveryFee : zero;
  }

  if (!coupon.value || coupon.value.lessThanOrEqualTo(zero)) return zero;

  const bruto =
    coupon.type === CouponTypeEnum.Percent
      ? itemsValue.times(coupon.value).dividedBy(100)
      : coupon.value;

  // Teto do cupom percentual, quando definido: "20% off, até R$ 15".
  const comTeto =
    coupon.maxDiscountValue && bruto.greaterThan(coupon.maxDiscountValue)
      ? coupon.maxDiscountValue
      : bruto;

  const limitado = comTeto.greaterThan(itemsValue) ? itemsValue : comTeto;

  return limitado.lessThan(zero) ? zero : new Prisma.Decimal(limitado.toFixed(2));
}

/**
 * Quanto a plataforma consegue bancar de desconto neste pedido.
 *
 * A plataforma custeia o desconto abatendo-o da própria retenção no split. Mas
 * a retenção também é de onde saem o frete e a gorjeta do entregador — então o
 * que sobra para descontar é exatamente a comissão. Passar disso exigiria
 * `marketplace_fee` negativo, que o Mercado Pago não aceita, e deixaria o
 * repasse do entregador sem lastro.
 *
 * Restaurante que fatura por assinatura não gera comissão: o teto é zero e
 * nenhum cupom cabe. Está documentado como limite conhecido.
 */
export function platformDiscountAllowance(commissionAmount: Prisma.Decimal | null): Prisma.Decimal {
  return commissionAmount && commissionAmount.greaterThan(0)
    ? commissionAmount
    : new Prisma.Decimal(0);
}
