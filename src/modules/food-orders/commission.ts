import { BillingTypeEnum, Prisma } from '@prisma/client';

/**
 * Comissão do delivery, isolada da classe para poder ser testada sem banco.
 *
 * Mora aqui, e não em `utils`, porque é regra do delivery — quem lê de fora é
 * o módulo de cupons, que precisa estimar a mesma comissão para saber até onde
 * o desconto pode ir. Antes desta separação o cálculo estava duplicado nos dois
 * arquivos, com a constante de 20% escrita duas vezes.
 */

/** Usado quando o dono do restaurante não tem taxa própria cadastrada. */
export const DEFAULT_COMMISSION_RATE = 20;

export interface CommissionOwner {
  billingType: BillingTypeEnum | null;
  deliveryCommissionRate: Prisma.Decimal | null;
}

/**
 * Percentual de comissão do pedido, ou `null` quando não há comissão.
 *
 * `null` e zero são coisas diferentes: `null` significa que o restaurante não
 * opera por comissão — o pedido nem grava `platformFeeRate`. Zero seria uma
 * comissão de 0%, que é outra coisa.
 */
export function resolveCommissionRate(owner: CommissionOwner | null | undefined): number | null {
  if (owner?.billingType !== BillingTypeEnum.Commission) return null;

  return owner.deliveryCommissionRate
    ? owner.deliveryCommissionRate.toNumber()
    : DEFAULT_COMMISSION_RATE;
}

/**
 * Valor da comissão sobre os ITENS do pedido.
 *
 * A base é só os itens de propósito: frete e gorjeta são do entregador, e
 * cobrar comissão sobre eles faria a plataforma reter mais do que o pedido
 * gravou — foi exatamente a divergência corrigida quando o split passou a
 * mandar valor em vez de percentual.
 */
export function calculateCommission(itemsValue: Prisma.Decimal, rate: number): Prisma.Decimal {
  return new Prisma.Decimal((itemsValue.toNumber() * (rate / 100)).toFixed(2));
}
