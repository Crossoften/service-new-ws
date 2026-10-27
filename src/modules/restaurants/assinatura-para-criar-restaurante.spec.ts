import { PrismaService } from '@database/PrismaService';
import { User } from '@prisma/client';

import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { SupplierSubscriptionRequiredException } from '../subscription-guard/exceptions/supplier-subscription-required.exception';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

const FORNECEDOR = { id: 9, billingType: 'Commission' } as User;

/**
 * Criar restaurante exige assinatura vigente, inclusive de quem fatura por
 * comissão.
 *
 * Antes desta regra o `Commission` era isento: criava restaurante sem
 * assinatura nenhuma, porque o percentual por pedido era entendido como
 * substituto da assinatura. A regra do produto passou a ser a soma — assinatura
 * **e** percentual — então o portão vale para todos.
 */
function build(gateFalha: boolean) {
  const criar = jest.fn().mockResolvedValue({ id: 1 });
  const buscar = jest.fn().mockResolvedValue(null);

  const prisma = {
    restaurant: { findUnique: buscar, create: criar },
    restaurantCategory: { findUnique: jest.fn().mockResolvedValue(null) },
  } as unknown as PrismaService;

  const assertActiveSubscription = jest.fn();
  if (gateFalha) {
    assertActiveSubscription.mockRejectedValue(new SupplierSubscriptionRequiredException());
  }

  const service = new RestaurantsService(
    prisma,
    { assertActiveSubscription } as unknown as SubscriptionGuardService,
    {
      deliveryCommissionRate: jest.fn().mockResolvedValue(20),
    } as unknown as PlatformSettingsService,
  );

  return { service, assertActiveSubscription, criar, buscar };
}

describe('restaurants.create — assinatura obrigatória', () => {
  it('consulta o portão de assinatura antes de qualquer coisa', async () => {
    const { service, assertActiveSubscription, buscar } = build(false);

    await service.create(FORNECEDOR, {} as CreateRestaurantDto).catch(() => undefined);

    expect(assertActiveSubscription).toHaveBeenCalledWith(FORNECEDOR);
    // Sem opções: a isenção por comissão não existe mais e não há como pedi-la.
    expect(assertActiveSubscription.mock.calls[0]).toHaveLength(1);
    expect(buscar).toHaveBeenCalled();
  });

  it('não cria o restaurante quando não há assinatura vigente', async () => {
    const { service, criar, buscar } = build(true);

    await expect(service.create(FORNECEDOR, {} as CreateRestaurantDto)).rejects.toBeInstanceOf(
      SupplierSubscriptionRequiredException,
    );
    expect(criar).not.toHaveBeenCalled();
    // O portão é a primeira linha: nem a busca do restaurante existente roda.
    expect(buscar).not.toHaveBeenCalled();
  });
});
