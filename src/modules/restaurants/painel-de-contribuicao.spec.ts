import { PrismaService } from '@database/PrismaService';
import { Prisma, User } from '@prisma/client';

import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { RestaurantsService } from './restaurants.service';

/**
 * `GET /v1/restaurants/me/payouts` — o painel que mostra ao fornecedor quanto
 * ele contribuiu.
 *
 * O total só pode contar o que passou pela plataforma. Pedido pago na entrega
 * não gera comissão, e somá-lo mostraria uma contribuição maior do que a que
 * foi efetivamente retida — inclusive para os pedidos antigos, que foram
 * gravados com comissão quando a regra ainda era outra.
 */
/** Valor deliberadamente diferente do antigo 20 fixo no código. */
const TAXA_DO_PAINEL = 17;

function build(dono: { deliveryCommissionRate: string | null }) {
  const aggregate = jest.fn().mockResolvedValue({
    _count: { _all: 4 },
    _sum: {
      itemsValue: new Prisma.Decimal(500),
      commissionAmount: new Prisma.Decimal(75),
    },
  });

  const prisma = {
    restaurant: { findUnique: jest.fn().mockResolvedValue({ id: 3 }) },
    foodOrder: { aggregate },
  } as unknown as PrismaService;

  const user = {
    id: 9,
    billingType: 'Subscription',
    deliveryCommissionRate:
      dono.deliveryCommissionRate === null ? null : new Prisma.Decimal(dono.deliveryCommissionRate),
  } as User;

  return {
    service: new RestaurantsService(
      prisma,
      {} as SubscriptionGuardService,
      {
        deliveryCommissionRate: jest.fn().mockResolvedValue(TAXA_DO_PAINEL),
      } as unknown as PlatformSettingsService,
    ),
    aggregate,
    user,
  };
}

describe('painel de contribuição do restaurante', () => {
  it('conta só os pedidos liquidados pela plataforma', async () => {
    const { service, aggregate, user } = build({ deliveryCommissionRate: '15' });

    await service.findMyPayouts(user);

    expect(aggregate.mock.calls[0][0].where.settledOffPlatform).toBe(false);
  });

  it('mostra a taxa mesmo de quem opera por assinatura', async () => {
    // Era o caso que vinha vazio: assinatura não isenta mais do percentual.
    const { service, user } = build({ deliveryCommissionRate: '15' });

    const resposta = await service.findMyPayouts(user);

    expect(resposta.commissionRate).toBe('15.00');
    expect(resposta.billingType).toBe('Subscription');
  });

  it('mostra a taxa do painel quando o dono não tem taxa própria', async () => {
    // Era `20` fixo no código; agora é o que o administrador configurou.
    const { service, user } = build({ deliveryCommissionRate: null });

    const resposta = await service.findMyPayouts(user);

    expect(resposta.commissionRate).toBe('17.00');
  });

  it('devolve o total contribuído e o líquido do restaurante', async () => {
    const { service, user } = build({ deliveryCommissionRate: '15' });

    const resposta = await service.findMyPayouts(user);

    expect(resposta.totalCommission).toBe('75.00');
    expect(resposta.totalItemsValue).toBe('500.00');
    expect(resposta.netAmount).toBe('425.00');
    expect(resposta.totalOrders).toBe(4);
  });
});
