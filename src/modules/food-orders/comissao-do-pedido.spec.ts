import { PrismaService } from '@database/PrismaService';
import { PaymentMethodEnum, Prisma, User } from '@prisma/client';

import { CouponsService } from '../coupons/coupons.service';
import { MercadoPagoAccountsService } from '../mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { DEFAULT_COMMISSION_RATE } from './commission';
import { CreateFoodOrderDto } from './dto/create-food-order.dto';
import { FoodOrdersService } from './food-orders.service';

const CLIENTE = { id: 1, addressId: 5 } as User;
const ITENS = 100;

/**
 * Quem opera delivery paga assinatura **e** percentual, sem exceção — não há
 * mais condicional por `billingType`.
 *
 * A única coisa que não gera comissão é o pedido liquidado fora da plataforma:
 * dinheiro, ou cartão na maquininha do próprio estabelecimento. O valor não
 * passa pelo split, então não há de onde retê-la. Antes gravava-se a comissão
 * igual, criando um valor que ninguém cobrava e que ainda aparecia no total do
 * painel do fornecedor como se tivesse sido pago.
 */
function build(opcoes: {
  paymentMethod: PaymentMethodEnum;
  usesOwnCardMachine?: boolean;
  taxaPropria?: string | null;
  couponCode?: string;
}) {
  const criarPedido = jest.fn().mockResolvedValue({ id: 70 });
  const resolveForOrder = jest
    .fn()
    .mockResolvedValue({ coupon: { id: 1 }, discount: new Prisma.Decimal(0) });

  const tx = {
    foodOrder: { create: criarPedido },
    couponRedemption: { create: jest.fn() },
    chatRoom: { create: jest.fn() },
  };

  const prisma = {
    restaurant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 3,
        isActive: true,
        isOpen: true,
        userId: 9,
        name: 'Cantina',
        address: { latitude: 0, longitude: 0 },
        usesOwnCardMachine: opcoes.usesOwnCardMachine ?? false,
        user: { mpUserId: 'MP1', mpAccessToken: 'cifrado' },
      }),
    },
    menuItem: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 1, price: new Prisma.Decimal(ITENS), additions: [] }]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        deliveryCommissionRate:
          opcoes.taxaPropria == null ? null : new Prisma.Decimal(opcoes.taxaPropria),
      }),
    },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;

  const service = new FoodOrdersService(
    prisma,
    { notifyUser: jest.fn() } as unknown as NotificationsService,
    { verifySellerLinked: jest.fn() } as unknown as MercadoPagoService,
    {} as MercadoPagoAccountsService,
    { assertProviderCanSell: jest.fn() } as unknown as SubscriptionGuardService,
    { resolveForOrder } as unknown as CouponsService,
  );

  // O frete depende de endereço e de tabela de taxas; não é o que está sob
  // teste, e ele não entra na base da comissão.
  jest
    .spyOn(service as unknown as { calculateDeliveryFee: () => unknown }, 'calculateDeliveryFee')
    .mockResolvedValue(new Prisma.Decimal(10) as never);
  jest.spyOn(service, 'findById').mockResolvedValue({ id: 70 } as never);

  return { service, criarPedido, resolveForOrder };
}

function pedido(opcoes: Parameters<typeof build>[0]): CreateFoodOrderDto {
  return {
    restaurantId: 3,
    paymentMethod: opcoes.paymentMethod,
    items: [{ menuItemId: 1, quantity: 1 }],
    ...(opcoes.couponCode ? { couponCode: opcoes.couponCode } : {}),
  } as CreateFoodOrderDto;
}

async function criar(opcoes: Parameters<typeof build>[0]) {
  const { service, criarPedido } = build(opcoes);

  await service.create(CLIENTE, pedido(opcoes));

  return criarPedido.mock.calls[0][0].data;
}

describe('foodOrders.create — comissão', () => {
  it('cobra de quem não tem taxa própria, pela taxa padrão', async () => {
    const data = await criar({ paymentMethod: PaymentMethodEnum.Pix, taxaPropria: null });

    expect(Number(data.platformFeeRate)).toBe(DEFAULT_COMMISSION_RATE);
    expect(Number(data.commissionAmount)).toBe((ITENS * DEFAULT_COMMISSION_RATE) / 100);
  });

  it('cobra pela taxa própria do dono quando existe', async () => {
    const data = await criar({ paymentMethod: PaymentMethodEnum.Pix, taxaPropria: '12.5' });

    expect(Number(data.platformFeeRate)).toBe(12.5);
    expect(Number(data.commissionAmount)).toBe(12.5);
  });

  it('cobra 0% quando o admin cadastrou 0 para o restaurante', async () => {
    const data = await criar({ paymentMethod: PaymentMethodEnum.Pix, taxaPropria: '0' });

    expect(Number(data.platformFeeRate)).toBe(0);
    expect(Number(data.commissionAmount)).toBe(0);
  });

  // Os dois campos ficam `undefined` no `data`, e não `null`: no Prisma
  // `undefined` é "não escreve este campo", e as duas colunas são nullable, de
  // modo que a linha nasce com NULL. Mandar `null` explícito teria o mesmo
  // efeito aqui, mas a ausência é o que o código expressa.
  it('não cobra comissão de pedido em dinheiro', async () => {
    const data = await criar({ paymentMethod: PaymentMethodEnum.Cash, taxaPropria: null });

    expect(data.settledOffPlatform).toBe(true);
    expect(data.platformFeeRate).toBeUndefined();
    expect(data.commissionAmount).toBeUndefined();
  });

  it('não cobra comissão de cartão na maquininha do estabelecimento', async () => {
    const data = await criar({
      paymentMethod: PaymentMethodEnum.CreditCard,
      usesOwnCardMachine: true,
      taxaPropria: '12.5',
    });

    expect(data.settledOffPlatform).toBe(true);
    expect(data.commissionAmount).toBeUndefined();
  });

  it('cobra de cartão quando a cobrança passa pela plataforma', async () => {
    const data = await criar({
      paymentMethod: PaymentMethodEnum.CreditCard,
      usesOwnCardMachine: false,
      taxaPropria: '12.5',
    });

    expect(data.settledOffPlatform).toBe(false);
    expect(Number(data.commissionAmount)).toBe(12.5);
  });

  // A base é só os ITENS: frete e gorjeta são do entregador. O frete mockado é
  // 10 e não aparece em nenhuma conta acima.
  it('não cobra comissão sobre o frete', async () => {
    const data = await criar({ paymentMethod: PaymentMethodEnum.Pix, taxaPropria: '10' });

    expect(Number(data.commissionAmount)).toBe(10);
    expect(Number(data.deliveryFee)).toBe(10);
  });
});

describe('foodOrders.create — cupom e a origem do desconto', () => {
  // O desconto sai da comissão. Se o cupom não souber que o pedido é pago na
  // entrega, ele recusa dizendo "tente um pedido de valor maior" — conselho
  // impossível de seguir, porque não é o valor que falta.
  it('avisa o cupom quando o pedido é liquidado fora da plataforma', async () => {
    const opcoes = {
      paymentMethod: PaymentMethodEnum.Cash,
      taxaPropria: null,
      couponCode: 'DEZ',
    };
    const { service, resolveForOrder } = build(opcoes);

    await service.create(CLIENTE, pedido(opcoes));

    expect(resolveForOrder.mock.calls[0][0]).toMatchObject({
      settledOffPlatform: true,
      commissionAmount: null,
    });
  });

  it('manda a comissão real quando o pedido passa pela plataforma', async () => {
    const opcoes = {
      paymentMethod: PaymentMethodEnum.Pix,
      taxaPropria: '10',
      couponCode: 'DEZ',
    };
    const { service, resolveForOrder } = build(opcoes);

    await service.create(CLIENTE, pedido(opcoes));

    const params = resolveForOrder.mock.calls[0][0];
    expect(params.settledOffPlatform).toBe(false);
    expect(Number(params.commissionAmount)).toBe(10);
  });
});
