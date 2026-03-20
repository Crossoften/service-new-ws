import { SubscriptionInterval } from '../../enums/subscription-interval.enum';

export const planDefinitions = [
  {
    name: 'Plano mensal',
    slug: 'plano-mensal',
    description: 'Assinatura mensal com acesso completo aos recursos da plataforma.',
    price: '39.90',
    interval: SubscriptionInterval.Month,
    intervalCount: 1,
    sortOrder: 1,
    benefits: [
      'Acesso completo à plataforma',
      'Destaque básico dos anúncios',
      'Suporte prioritário',
      'Renovação simplificada',
    ],
  },
  {
    name: 'Plano trimestral',
    slug: 'plano-trimestral',
    description: 'Assinatura trimestral com economia no valor total.',
    price: '99.90',
    interval: SubscriptionInterval.Month,
    intervalCount: 3,
    sortOrder: 2,
    benefits: [
      'Acesso completo à plataforma',
      'Destaque intermediário dos anúncios',
      'Suporte prioritário',
      'Melhor custo-benefício trimestral',
    ],
  },
  {
    name: 'Plano anual',
    slug: 'plano-anual',
    description: 'Assinatura anual com maior economia e benefícios estendidos.',
    price: '112.50',
    interval: SubscriptionInterval.Year,
    intervalCount: 1,
    sortOrder: 3,
    benefits: [
      'Acesso completo à plataforma',
      'Destaque premium dos anúncios',
      'Suporte prioritário',
      'Maior economia anual',
    ],
  },
];
