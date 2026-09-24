import { SubscriptionIntervalEnum } from '../../enums/subscription-interval.enum';

/**
 * Planos do lançamento, por categoria de atuação.
 *
 * `price` é o valor COBRADO no ciclo — é ele que vai para o Mercado Pago. O
 * "/mês" da peça de venda (R$ 14,90 e R$ 9,90) é derivado no DTO, e não
 * guardado: se o preço mudar, um valor calculado não tem como discordar do
 * outro.
 *
 * Confere com a arte: 14,90 × 6 = 89,40 e 9,90 × 12 = 118,80. A economia anual
 * anunciada (R$ 120,00) é 19,90 × 12 − 118,80.
 *
 * O trimestral sai do lançamento. Ele segue na lista com `isActive: false` em
 * vez de ser removido: apagar quebraria a FK de quem já assinou e levaria o
 * histórico de faturamento junto.
 */
export const planDefinitions = [
  {
    name: 'Plano mensal',
    slug: 'plano-mensal',
    description: 'Assinatura mensal de uma categoria de atuação. Sem fidelidade e sem adesão.',
    price: '19.90',
    interval: SubscriptionIntervalEnum.Month,
    intervalCount: 1,
    bonusMonths: 0,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Plano semestral',
    slug: 'plano-semestral',
    description: 'Assinatura semestral de uma categoria de atuação. Equivale a R$ 14,90 por mês.',
    price: '89.40',
    interval: SubscriptionIntervalEnum.Month,
    intervalCount: 6,
    bonusMonths: 0,
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Plano anual',
    slug: 'plano-anual',
    description:
      'Assinatura anual de uma categoria de atuação. Equivale a R$ 9,90 por mês, ' +
      'uma economia de R$ 120,00 por ano.',
    price: '118.80',
    interval: SubscriptionIntervalEnum.Year,
    intervalCount: 1,
    bonusMonths: 0,
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Plano trimestral',
    slug: 'plano-trimestral',
    description: 'Fora do lançamento.',
    price: '99.90',
    interval: SubscriptionIntervalEnum.Month,
    intervalCount: 3,
    bonusMonths: 0,
    isActive: false,
    sortOrder: 4,
  },
];
