import { PrismaService } from '@database/PrismaService';
import { PaymentMethodEnum, User } from '@prisma/client';

import { CouponsService } from '../coupons/coupons.service';
import { MercadoPagoAccountsService } from '../mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { ProviderNotSellingException } from '../subscription-guard/exceptions/provider-not-selling.exception';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CreateFoodOrderDto } from './dto/create-food-order.dto';
import { FoodOrdersService } from './food-orders.service';

const CLIENTE = { id: 1, addressId: 5 } as User;
const DONO_DO_RESTAURANTE = 9;

const PEDIDO = {
  restaurantId: 3,
  paymentMethod: PaymentMethodEnum.Cash,
  items: [{ menuItemId: 1, quantity: 1 }],
} as CreateFoodOrderDto;

/**
 * Receber pedido exige que o restaurante tenha assinatura vigente **no dia do
 * pedido**, inclusive quando o dono fatura por comissão.
 *
 * Duas coisas somadas aqui: a verificação a cada pedido, que já existia, e o
 * fim da isenção por comissão. Antes, um dono em `Commission` vendia para
 * sempre sem nunca ter assinado.
 *
 * O pedido é em dinheiro de propósito: liquidação fora da plataforma dispensa a
 * conta vinculada no Mercado Pago, o que mantém o teste no que está sob prova.
 */
function build(gateFalha: boolean) {
  const criarPedido = jest.fn().mockResolvedValue({ id: 70 });

  const prisma = {
    restaurant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 3,
        isActive: true,
        isOpen: true,
        userId: DONO_DO_RESTAURANTE,
        name: 'Cantina',
        address: { latitude: 0, longitude: 0 },
        usesOwnCardMachine: false,
        user: { mpUserId: 'MP1', mpAccessToken: 'cifrado' },
      }),
    },
    menuItem: { findMany: jest.fn().mockResolvedValue([]) },
    foodOrder: { create: criarPedido },
  } as unknown as PrismaService;

  const assertProviderCanSell = jest.fn();
  if (gateFalha) {
    assertProviderCanSell.mockRejectedValue(new ProviderNotSellingException());
  }

  const service = new FoodOrdersService(
    prisma,
    { notifyUser: jest.fn() } as unknown as NotificationsService,
    { verifySellerLinked: jest.fn() } as unknown as MercadoPagoService,
    {} as MercadoPagoAccountsService,
    { assertProviderCanSell } as unknown as SubscriptionGuardService,
    {} as CouponsService,
    {
      deliveryCommissionRate: jest.fn().mockResolvedValue(20),
    } as unknown as PlatformSettingsService,
  );

  return { service, assertProviderCanSell, criarPedido };
}

describe('foodOrders.create — assinatura do restaurante', () => {
  it('consulta o portão com o dono do restaurante', async () => {
    const { service, assertProviderCanSell } = build(false);

    await service.create(CLIENTE, PEDIDO).catch(() => undefined);

    expect(assertProviderCanSell).toHaveBeenCalledWith(DONO_DO_RESTAURANTE);
    // Sem opções: a isenção por comissão não existe mais e não há como pedi-la.
    expect(assertProviderCanSell.mock.calls[0]).toHaveLength(1);
  });

  it('não cria o pedido quando o restaurante não pode vender', async () => {
    const { service, criarPedido } = build(true);

    await expect(service.create(CLIENTE, PEDIDO)).rejects.toBeInstanceOf(
      ProviderNotSellingException,
    );
    expect(criarPedido).not.toHaveBeenCalled();
  });
});
