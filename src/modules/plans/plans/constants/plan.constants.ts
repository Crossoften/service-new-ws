import { SubscriptionIntervalEnum } from '../../enums/subscription-interval.enum';

export const planDefinitions = [
  {
    name: 'Plano mensal',
    slug: 'plano-mensal',
    description: 'Assinatura mensal com acesso completo aos recursos da plataforma.',
    price: '39.90',
    interval: SubscriptionIntervalEnum.Month,
    intervalCount: 1,
    bonusMonths: 0,
    sortOrder: 1,
  },
  {
    name: 'Plano trimestral',
    slug: 'plano-trimestral',
    description: 'Assinatura trimestral com economia no valor total.',
    price: '99.90',
    interval: SubscriptionIntervalEnum.Month,
    intervalCount: 3,
    bonusMonths: 0,
    sortOrder: 2,
  },
  {
    name: 'Plano semestral',
    slug: 'plano-semestral',
    description: 'Assinatura semestral com economia no valor total.',
    price: '199.90',
    interval: SubscriptionIntervalEnum.Month,
    intervalCount: 6,
    bonusMonths: 0,
    sortOrder: 3,
  },
  {
    name: 'Plano anual',
    slug: 'plano-anual',
    description: 'Assinatura anual com maior economia e benefícios estendidos.',
    price: '349.90',
    interval: SubscriptionIntervalEnum.Year,
    intervalCount: 1,
    bonusMonths: 0,
    sortOrder: 4,
  },
];
