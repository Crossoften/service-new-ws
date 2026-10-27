import { PrismaService } from '@database/PrismaService';
import { Prisma, User } from '@prisma/client';

import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { CouponsService } from './coupons.service';
import { CouponNotApplicableException } from './exceptions/coupon-not-applicable.exception';

const CLIENTE = { id: 1 } as User;
const TAXA_DO_PAINEL = 20;

/**
 * O desconto do cupom sai da comissão da plataforma. Pedido pago na entrega não
 * gera comissão, então não há de onde tirar o desconto — e a recusa precisa
 * dizer isso.
 *
 * Antes da distinção, a mensagem era "tente um pedido de valor maior", conselho
 * impossível de seguir: não é o valor que falta, é a comissão, que esse pedido
 * não gera por natureza.
 */
function build() {
  const prisma = {
    coupon: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        code: 'DEZ',
        type: 'FixedAmount',
        isActive: true,
        value: new Prisma.Decimal(10),
        startsAt: null,
        endsAt: null,
        restaurantId: null,
        minOrderValue: null,
        maxDiscount: null,
        usageLimit: null,
        usageLimitPerUser: null,
      }),
    },
    couponRedemption: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;

  return new CouponsService(prisma, {
    deliveryCommissionRate: jest.fn().mockResolvedValue(TAXA_DO_PAINEL),
  } as unknown as PlatformSettingsService);
}

const PEDIDO = {
  code: 'DEZ',
  user: CLIENTE,
  restaurantId: 3,
  itemsValue: new Prisma.Decimal(100),
  deliveryFee: new Prisma.Decimal(10),
};

describe('cupom em pedido que não gera comissão', () => {
  it('explica que o pedido pago na entrega não custeia desconto', async () => {
    const service = build();

    await expect(
      service.resolveForOrder({ ...PEDIDO, commissionAmount: null, settledOffPlatform: true }),
    ).rejects.toThrow(/pago na entrega/);
  });

  it('mantém a mensagem de valor para pedido que passa pela plataforma', async () => {
    // Aqui a comissão existe, só é pequena demais para o desconto: o conselho
    // de aumentar o pedido faz sentido.
    const service = build();

    await expect(
      service.resolveForOrder({
        ...PEDIDO,
        commissionAmount: new Prisma.Decimal(2),
        settledOffPlatform: false,
      }),
    ).rejects.toThrow(/valor maior/);
  });

  it('aceita o cupom quando a comissão cobre o desconto', async () => {
    const service = build();

    const { discount } = await service.resolveForOrder({
      ...PEDIDO,
      commissionAmount: new Prisma.Decimal(20),
      settledOffPlatform: false,
    });

    expect(discount.toFixed(2)).toBe('10.00');
  });

  it('a recusa é sempre CouponNotApplicableException', async () => {
    const service = build();

    await expect(
      service.resolveForOrder({ ...PEDIDO, commissionAmount: null, settledOffPlatform: true }),
    ).rejects.toBeInstanceOf(CouponNotApplicableException);
  });
});
