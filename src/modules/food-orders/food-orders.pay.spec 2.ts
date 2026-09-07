import { PrismaService } from '@database/PrismaService';
import { ConfigService } from '@nestjs/config';
import { FoodOrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum, Prisma } from '@prisma/client';

import { MercadoPagoAccountsService } from '../mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { SellerNotLinkedMercadoPagoException } from '../mercado-pago/exceptions/seller-not-linked-mercado-pago.exception';
import { PaymentReferenceTypeEnum } from '../works/enums/payment-reference-type.enum';
import { FoodOrdersService } from './food-orders.service';
import { FoodOrderAccessDeniedException } from './exceptions/food-order-access-denied.exception';
import { FoodOrderCheckoutNotAvailableException } from './exceptions/food-order-checkout-not-available.exception';
import { FoodOrderInvalidStatusException } from './exceptions/food-order-invalid-status.exception';
import { FoodOrderNotFoundException } from './exceptions/food-order-not-found.exception';

const CLIENTE = { id: 10 } as never;

const PEDIDO_BASE = {
  id: 1,
  status: FoodOrderStatusEnum.Received,
  paymentMethod: PaymentMethodEnum.Pix,
  paymentStatus: PaymentStatusEnum.Pending,
  totalValue: new Prisma.Decimal('58.00'),
  platformFeeRate: new Prisma.Decimal('20.00'),
  customerId: 10,
  restaurant: {
    name: 'Cantina',
    userId: 20,
    user: { mpUserId: '123456', mpAccessToken: 'v1:cifrado' },
  },
};

function build(pedido: Record<string, unknown> | null, emAberto: { id: number } | null = null) {
  const create = jest.fn().mockResolvedValue({ id: 99 });

  const prisma = {
    foodOrder: { findUnique: jest.fn().mockResolvedValue(pedido) },
    payment: { findFirst: jest.fn().mockResolvedValue(emAberto), create },
  } as unknown as PrismaService;

  const configService = { get: () => undefined } as unknown as ConfigService;

  // O MercadoPagoService é real de propósito: `verifySellerLinked` é uma das
  // travas sob teste e um duplo só provaria que o duplo funciona.
  const mercadoPago = new MercadoPagoService(configService);
  const createPreference = jest
    .fn()
    .mockResolvedValue({ preferenceId: 'pref-1', checkoutUrl: 'https://mp/checkout' });
  (mercadoPago as unknown as { createPreference: unknown }).createPreference = createPreference;

  const accounts = {
    accessTokenFor: jest.fn().mockResolvedValue('token-do-vendedor'),
  } as unknown as MercadoPagoAccountsService;

  const service = new FoodOrdersService(
    prisma,
    { notifyUser: jest.fn() } as never,
    mercadoPago,
    accounts,
    { assertProviderCanSell: jest.fn() } as never,
  );

  // A montagem da resposta já é coberta pelas rotas de leitura; aqui só
  // atrapalharia, exigindo o grafo inteiro do pedido no duplo do Prisma.
  (service as unknown as { buildResponse: unknown }).buildResponse = jest
    .fn()
    .mockResolvedValue({ id: 1 });

  return { service, create, createPreference };
}

describe('FoodOrdersService.pay', () => {
  it('recusa pedido inexistente', async () => {
    const { service } = build(null);

    await expect(service.pay(CLIENTE, 1, {})).rejects.toBeInstanceOf(FoodOrderNotFoundException);
  });

  it('recusa quem não é o cliente do pedido', async () => {
    const { service } = build({ ...PEDIDO_BASE, customerId: 999 });

    await expect(service.pay(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      FoodOrderAccessDeniedException,
    );
  });

  it('recusa pedido em dinheiro: liquida na entrega, não gera checkout', async () => {
    const { service } = build({ ...PEDIDO_BASE, paymentMethod: PaymentMethodEnum.Cash });

    await expect(service.pay(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      FoodOrderCheckoutNotAvailableException,
    );
  });

  it('recusa pedido cancelado', async () => {
    const { service } = build({ ...PEDIDO_BASE, status: FoodOrderStatusEnum.Cancelled });

    await expect(service.pay(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      FoodOrderInvalidStatusException,
    );
  });

  it('recusa pedido já pago', async () => {
    const { service } = build({ ...PEDIDO_BASE, paymentStatus: PaymentStatusEnum.Paid });

    await expect(service.pay(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      FoodOrderCheckoutNotAvailableException,
    );
  });

  it('recusa segundo checkout enquanto o primeiro está em aberto', async () => {
    const { service, createPreference } = build(PEDIDO_BASE, { id: 77 });

    await expect(service.pay(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      FoodOrderCheckoutNotAvailableException,
    );
    expect(createPreference).not.toHaveBeenCalled();
  });

  it('recusa quando o restaurante não tem conta do Mercado Pago vinculada', async () => {
    const { service } = build({
      ...PEDIDO_BASE,
      restaurant: { ...PEDIDO_BASE.restaurant, user: { mpUserId: null, mpAccessToken: null } },
    });

    await expect(service.pay(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      SellerNotLinkedMercadoPagoException,
    );
  });

  it('cria a preferência na conta do vendedor com a taxa gravada no pedido', async () => {
    const { service, createPreference } = build(PEDIDO_BASE);

    const resultado = await service.pay(CLIENTE, 1, { payerEmail: 'cliente@example.com' });

    expect(createPreference).toHaveBeenCalledTimes(1);
    expect(createPreference.mock.calls[0][0]).toMatchObject({
      unitPrice: 58,
      payerEmail: 'cliente@example.com',
      sellerAccessToken: 'token-do-vendedor',
      marketplaceFeeRate: 20,
    });
    expect(resultado.checkoutUrl).toBe('https://mp/checkout');
  });

  it('grava o pagamento local pendente amarrado ao pedido', async () => {
    const { service, create, createPreference } = build(PEDIDO_BASE);

    await service.pay(CLIENTE, 1, {});

    const gravado = create.mock.calls[0][0].data;

    expect(gravado).toMatchObject({
      status: PaymentStatusEnum.Pending,
      method: PaymentMethodEnum.Pix,
      referenceType: PaymentReferenceTypeEnum.FoodOrder,
      referenceId: 1,
      payerId: 10,
      receiverId: 20,
      mpPreferenceId: 'pref-1',
    });
    expect(Number(gravado.amount)).toBe(58);
    // O mesmo external_reference amarra a preferência ao pagamento local: é por
    // ele que o webhook encontra o pedido.
    expect(gravado.externalReference).toBe(createPreference.mock.calls[0][0].externalReference);
  });

  it('não manda taxa de split quando o pedido não tem percentual gravado', async () => {
    const { service, createPreference } = build({ ...PEDIDO_BASE, platformFeeRate: null });

    await service.pay(CLIENTE, 1, {});

    expect(createPreference.mock.calls[0][0].marketplaceFeeRate).toBeUndefined();
  });
});
