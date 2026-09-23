import { PrismaService } from '@database/PrismaService';
import { Prisma } from '@prisma/client';

import { MercadoPagoService } from '../../src/modules/mercado-pago/mercado-pago.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { WebhooksService } from '../../src/modules/webhooks/webhooks.service';
import { criarRestaurante, criarUsuario, limparBanco, prisma } from './db';

/**
 * A idempotência do webhook depende do bloqueio de linha do InnoDB no
 * `UPDATE ... WHERE status != 'Paid'`. Com duplo de Prisma dá para testar a
 * lógica em volta; a corrida só se prova contra o banco.
 *
 * O Mercado Pago reenvia notificação por padrão — não é caso raro. Sem a
 * trava, cada reenvio lançava crédito e débito de novo, dobrando o extrato do
 * restaurante.
 */
describe('webhook do Mercado Pago — notificação duplicada', () => {
  let service: WebhooksService;
  let pagamentoId: number;
  let pedidoId: number;
  let restauranteDonoId: number;
  let clienteId: number;

  const REFERENCIA = 'ext-integracao-1';

  function build(mpStatus = 'approved') {
    const mercadoPago = {
      verifySignature: () => true,
      getPayment: jest
        .fn()
        .mockResolvedValue({ id: 'MP-INT-1', status: mpStatus, external_reference: REFERENCIA }),
      mapPaymentMethod: () => 'Pix',
    } as unknown as MercadoPagoService;

    const notificacoes = { notifyUser: jest.fn() } as unknown as NotificationsService;

    return new WebhooksService(prisma as unknown as PrismaService, mercadoPago, notificacoes);
  }

  async function notificar(alvo = service) {
    await alvo.handleMercadoPagoNotification(
      { type: 'payment', data: { id: 'MP-INT-1' } },
      {},
      'assinatura',
      'req-1',
    );
  }

  beforeEach(async () => {
    await limparBanco();

    const restaurante = await criarRestaurante();
    const cliente = await criarUsuario('Cliente');
    restauranteDonoId = restaurante.userId;
    clienteId = cliente.id;

    const pedido = await prisma.foodOrder.create({
      data: {
        itemsValue: new Prisma.Decimal('40.00'),
        deliveryFee: new Prisma.Decimal('10.00'),
        totalValue: new Prisma.Decimal('50.00'),
        paymentMethod: 'Pix',
        restaurantId: restaurante.id,
        customerId: clienteId,
      },
      select: { id: true },
    });
    pedidoId = pedido.id;

    const pagamento = await prisma.payment.create({
      data: {
        status: 'Pending',
        referenceType: 'FoodOrder',
        referenceId: pedidoId,
        amount: new Prisma.Decimal('50.00'),
        payerId: clienteId,
        receiverId: restauranteDonoId,
        externalReference: REFERENCIA,
        platformFeeAmount: new Prisma.Decimal('8.00'),
      },
      select: { id: true },
    });
    pagamentoId = pagamento.id;

    service = build();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('confirma o pagamento e lança o razão', async () => {
    await notificar();

    const pagamento = await prisma.payment.findUnique({ where: { id: pagamentoId } });
    const pedido = await prisma.foodOrder.findUnique({ where: { id: pedidoId } });

    expect(pagamento?.status).toBe('Paid');
    expect(pagamento?.mpPaymentId).toBe('MP-INT-1');
    expect(pedido?.paymentStatus).toBe('Paid');
  });

  it('duas notificações simultâneas lançam o razão uma vez só', async () => {
    // É este o cenário que o unitário não alcança: as duas transações abertas
    // ao mesmo tempo, disputando a mesma linha.
    await Promise.allSettled([notificar(build()), notificar(build())]);

    const lancamentos = await prisma.financialTransaction.findMany({
      where: { referenceType: 'FoodOrder', referenceId: pedidoId },
    });

    // Débito do cliente, crédito dos itens ao restaurante, e a taxa da
    // plataforma. Três, não seis.
    expect(lancamentos).toHaveLength(3);
  });

  it('o restaurante é creditado só pelos itens, uma vez', async () => {
    await Promise.allSettled([notificar(build()), notificar(build())]);

    const creditos = await prisma.financialTransaction.findMany({
      where: { userId: restauranteDonoId, type: 'Credit' },
    });

    expect(creditos).toHaveLength(1);
    expect(creditos[0].amount.toFixed(2)).toBe('40.00');
  });

  it('notificação repetida depois de confirmado não faz nada e não estoura', async () => {
    await notificar();
    await expect(notificar(build())).resolves.toBeUndefined();

    const lancamentos = await prisma.financialTransaction.count({
      where: { referenceType: 'FoodOrder', referenceId: pedidoId },
    });

    expect(lancamentos).toBe(3);
  });
});

describe('webhook do Mercado Pago — estorno', () => {
  let pagamentoId: number;
  let pedidoId: number;

  const REFERENCIA = 'ext-integracao-2';

  function build(mpStatus: string) {
    const mercadoPago = {
      verifySignature: () => true,
      getPayment: jest
        .fn()
        .mockResolvedValue({ id: 'MP-INT-2', status: mpStatus, external_reference: REFERENCIA }),
      mapPaymentMethod: () => 'Pix',
    } as unknown as MercadoPagoService;

    return new WebhooksService(prisma as unknown as PrismaService, mercadoPago, {
      notifyUser: jest.fn(),
    } as unknown as NotificationsService);
  }

  beforeEach(async () => {
    await limparBanco();

    const restaurante = await criarRestaurante();
    const cliente = await criarUsuario('Cliente');

    const pedido = await prisma.foodOrder.create({
      data: {
        itemsValue: new Prisma.Decimal('40.00'),
        deliveryFee: new Prisma.Decimal('10.00'),
        totalValue: new Prisma.Decimal('50.00'),
        paymentMethod: 'Pix',
        paymentStatus: 'Paid',
        restaurantId: restaurante.id,
        customerId: cliente.id,
      },
      select: { id: true },
    });
    pedidoId = pedido.id;

    const pagamento = await prisma.payment.create({
      data: {
        status: 'Paid',
        referenceType: 'FoodOrder',
        referenceId: pedidoId,
        amount: new Prisma.Decimal('50.00'),
        payerId: cliente.id,
        receiverId: restaurante.userId,
        externalReference: REFERENCIA,
      },
      select: { id: true },
    });
    pagamentoId = pagamento.id;
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  for (const mpStatus of ['refunded', 'charged_back']) {
    it(`marca pagamento e pedido como estornados em ${mpStatus}`, async () => {
      await build(mpStatus).handleMercadoPagoNotification(
        { type: 'payment', data: { id: 'MP-INT-2' } },
        {},
        'assinatura',
        'req-1',
      );

      const pagamento = await prisma.payment.findUnique({ where: { id: pagamentoId } });
      const pedido = await prisma.foodOrder.findUnique({ where: { id: pedidoId } });

      expect(pagamento?.status).toBe('Refunded');
      expect(pedido?.paymentStatus).toBe('Refunded');
    });
  }
});
