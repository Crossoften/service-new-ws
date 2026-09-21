import { PrismaService } from '@database/PrismaService';
import { Prisma } from '@prisma/client';

import { NotificationsService } from '../../notifications/notifications.service';
import { PaymentStatusEnum } from '../../works/enums/payment-status.enum';
import { AdminDeliveryPayoutsService } from './admin-delivery-payouts.service';

const dec = (v: string) => new Prisma.Decimal(v);

function build(
  creditos: { userId: number; amount: string; referenceId: number; createdAt: Date }[],
  pedidosEstornados: number[],
) {
  const buscarPedidos = jest.fn().mockResolvedValue(pedidosEstornados.map((id) => ({ id })));

  const prisma = {
    financialTransaction: {
      findMany: jest.fn().mockResolvedValue(
        creditos.map((c) => ({
          userId: c.userId,
          amount: dec(c.amount),
          createdAt: c.createdAt,
          referenceId: c.referenceId,
        })),
      ),
    },
    foodOrder: { findMany: buscarPedidos },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 7, name: 'Maria', phone: '+5534998701109', bankAccount: null },
        { id: 8, name: 'João', phone: null, bankAccount: null },
      ]),
    },
  } as unknown as PrismaService;

  const service = new AdminDeliveryPayoutsService(prisma, {} as NotificationsService);

  return { service, buscarPedidos };
}

const ONTEM = new Date('2026-09-20T10:00:00Z');
const HOJE = new Date('2026-09-21T10:00:00Z');

describe('payouts pendentes — estornos sinalizados', () => {
  it('soma e conta por entregador', async () => {
    const { service } = build(
      [
        { userId: 7, amount: '8.00', referenceId: 1, createdAt: HOJE },
        { userId: 7, amount: '10.50', referenceId: 2, createdAt: ONTEM },
        { userId: 8, amount: '5.00', referenceId: 3, createdAt: HOJE },
      ],
      [],
    );

    const pendentes = await service.findPending();

    expect(pendentes).toHaveLength(2);
    expect(pendentes[0]).toMatchObject({ courierId: 7, amount: '18.50', deliveries: 2 });
    expect(pendentes[1]).toMatchObject({ courierId: 8, amount: '5.00', deliveries: 1 });
  });

  it('usa a data do crédito mais antigo', async () => {
    const { service } = build(
      [
        { userId: 7, amount: '8.00', referenceId: 1, createdAt: HOJE },
        { userId: 7, amount: '10.50', referenceId: 2, createdAt: ONTEM },
      ],
      [],
    );

    expect((await service.findPending())[0].oldestAt).toEqual(ONTEM);
  });

  it('não sinaliza nada quando nenhum pedido foi estornado', async () => {
    const { service } = build([{ userId: 7, amount: '8.00', referenceId: 1, createdAt: HOJE }], []);

    const [pendente] = await service.findPending();

    expect(pendente.refundedDeliveries).toBe(0);
    expect(pendente.refundedAmount).toBe('0.00');
  });

  it('separa quanto do saldo veio de pedido estornado', async () => {
    const { service } = build(
      [
        { userId: 7, amount: '8.00', referenceId: 1, createdAt: HOJE },
        { userId: 7, amount: '10.50', referenceId: 2, createdAt: HOJE },
      ],
      [2],
    );

    const [pendente] = await service.findPending();

    // O saldo continua cheio: a plataforma não reverte nada sozinha. O que
    // muda é que o admin vê de onde vem antes de pagar.
    expect(pendente.amount).toBe('18.50');
    expect(pendente.refundedDeliveries).toBe(1);
    expect(pendente.refundedAmount).toBe('10.50');
  });

  it('procura estorno só entre os pedidos que têm crédito em aberto', async () => {
    const { service, buscarPedidos } = build(
      [
        { userId: 7, amount: '8.00', referenceId: 1, createdAt: HOJE },
        { userId: 8, amount: '5.00', referenceId: 1, createdAt: HOJE },
      ],
      [],
    );

    await service.findPending();

    expect(buscarPedidos.mock.calls[0][0].where).toEqual({
      id: { in: [1] },
      paymentStatus: PaymentStatusEnum.Refunded,
    });
  });

  it('devolve lista vazia sem nenhum crédito em aberto', async () => {
    const { service } = build([], []);

    expect(await service.findPending()).toEqual([]);
  });
});
