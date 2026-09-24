import { planDefinitions } from './constants/plan.constants';
import { SubscriptionIntervalEnum } from '../enums/subscription-interval.enum';

/**
 * Trava os números da peça de venda.
 *
 * O valor exibido ao fornecedor é "por mês", e o cobrado é o do ciclo. São duas
 * grandezas diferentes derivadas do mesmo campo, então uma edição de preço que
 * esqueça a conta publica uma promessa que a cobrança não cumpre.
 */
function mesesDoCiclo(plano: (typeof planDefinitions)[number]): number {
  return plano.interval === SubscriptionIntervalEnum.Year
    ? plano.intervalCount * 12
    : plano.intervalCount;
}

describe('planos do lançamento', () => {
  const porSlug = (slug: string) => planDefinitions.find((p) => p.slug === slug)!;

  it.each([
    ['plano-mensal', 1, '19.90', 19.9],
    ['plano-semestral', 6, '89.40', 14.9],
    ['plano-anual', 12, '118.80', 9.9],
  ])('%s cobra %s no ciclo e equivale ao valor anunciado', (slug, meses, total, porMes) => {
    const plano = porSlug(slug as string);

    expect(plano.isActive).toBe(true);
    expect(mesesDoCiclo(plano)).toBe(meses);
    expect(plano.price).toBe(total);
    expect(Number(plano.price) / (meses as number)).toBeCloseTo(porMes as number, 2);
  });

  it('a economia anual anunciada é de R$ 120,00', () => {
    const doze = Number(porSlug('plano-mensal').price) * 12;
    const anual = Number(porSlug('plano-anual').price);

    expect(doze - anual).toBeCloseTo(120, 2);
  });

  it('o trimestral fica cadastrado, porém inativo', () => {
    // Apagar quebraria a FK de quem já assinou e levaria junto o histórico de
    // faturamento. Inativar tira da vitrine sem perder nada.
    expect(porSlug('plano-trimestral').isActive).toBe(false);
  });

  it('só os três planos da arte ficam ativos', () => {
    expect(planDefinitions.filter((p) => p.isActive).map((p) => p.slug)).toEqual([
      'plano-mensal',
      'plano-semestral',
      'plano-anual',
    ]);
  });
});
