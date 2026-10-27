import { Prisma } from '@prisma/client';

/**
 * Comissão do delivery, isolada da classe para poder ser testada sem banco.
 *
 * Mora aqui, e não em `utils`, porque é regra do delivery — quem lê de fora é
 * o módulo de cupons, que precisa estimar a mesma comissão para saber até onde
 * o desconto pode ir. Antes desta separação o cálculo estava duplicado nos dois
 * arquivos, com a constante de 20% escrita duas vezes.
 */

/**
 * Último recurso quando não há taxa própria do dono **nem** taxa no painel.
 *
 * Não é configuração: o valor que vale é o que o administrador define em
 * `PlatformSettings`, e por isso quem chama é obrigado a informá-lo. A
 * constante existe para o caso de não haver resposta nenhuma do painel.
 */
export const DEFAULT_COMMISSION_RATE = 20;

export interface CommissionOwner {
  deliveryCommissionRate: Prisma.Decimal | null;
}

/**
 * Percentual de comissão do pedido.
 *
 * Quem opera delivery paga assinatura **e** percentual, sem exceção. Até esta
 * mudança havia condicional por `billingType`: o percentual valia só para
 * `Commission`, e quem estava em `Subscription` pagava a assinatura e nada
 * além dela. Era um ou o outro; passou a ser a soma, então o condicional saiu e
 * a função sempre devolve um número — o `null` de antes significava "não opera
 * por comissão", caso que deixou de existir.
 *
 * Taxa própria igual a **zero** vale como 0% e não cai no padrão: é decisão do
 * admin ("este restaurante não paga comissão"), diferente de não ter taxa. O
 * `??` garante isso, porque só cai no padrão em `null`/`undefined` — um `||`
 * aqui trataria 0% como ausência.
 */
export function resolveCommissionRate(
  owner: CommissionOwner | null | undefined,
  defaultRate: number,
): number {
  return owner?.deliveryCommissionRate?.toNumber() ?? defaultRate;
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
