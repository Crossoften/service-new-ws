import { PrismaService } from '@database/PrismaService';
import { Prisma, User } from '@prisma/client';

import { DeliveriesGateway } from './deliveries.gateway';
import { DeliveriesService } from './deliveries.service';
import { NotificationsService } from '../notifications/notifications.service';

const ENTREGADOR = { id: 7 } as User;

function build() {
  // Cada chamada devolve um valor diferente para dar para distinguir qual
  // recorte foi para qual campo da resposta.
  let chamada = 0;
  const valores = ['10.00', '30.00', '90.00', '180.00', '50.00', '130.00'];

  const aggregate = jest.fn().mockImplementation(() =>
    Promise.resolve({
      _sum: { amount: new Prisma.Decimal(valores[chamada++]) },
      _count: { _all: 1 },
    }),
  );

  const prisma = { financialTransaction: { aggregate } } as unknown as PrismaService;

  const service = new DeliveriesService(
    prisma,
    {} as DeliveriesGateway,
    {} as NotificationsService,
  );

  return { service, aggregate };
}

describe('deliveries.findMyEarnings — a receber x já recebido', () => {
  it('separa o saldo em aberto do que já foi repassado', async () => {
    const { service } = build();

    const ganhos = await service.findMyEarnings(ENTREGADOR);

    expect(ganhos.total.amount).toBe('180.00');
    expect(ganhos.available.amount).toBe('50.00');
    expect(ganhos.paid.amount).toBe('130.00');
  });

  it('a receber são os créditos sem lote de repasse', async () => {
    const { service, aggregate } = build();

    await service.findMyEarnings(ENTREGADOR);

    expect(aggregate.mock.calls[4][0].where.payoutId).toBeNull();
  });

  it('já recebido são os créditos com lote', async () => {
    const { service, aggregate } = build();

    await service.findMyEarnings(ENTREGADOR);

    expect(aggregate.mock.calls[5][0].where.payoutId).toEqual({ not: null });
  });

  it('os recortes de tempo continuam somando pago e não pago', async () => {
    // Faturamento do entregador não muda quando o dinheiro sai da plataforma:
    // dia, semana, mês e total seguem ignorando a liquidação.
    const { service, aggregate } = build();

    await service.findMyEarnings(ENTREGADOR);

    for (const indice of [0, 1, 2, 3]) {
      expect(aggregate.mock.calls[indice][0].where).not.toHaveProperty('payoutId');
    }
  });
});
