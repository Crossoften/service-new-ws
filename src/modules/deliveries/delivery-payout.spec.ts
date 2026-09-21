import { PrismaService } from '@database/PrismaService';
import {
  DeliveryAssignmentStatusEnum,
  FinancialTransactionCategoryEnum,
  PaymentMethodEnum,
  Prisma,
  User,
} from '@prisma/client';

import { DeliveriesGateway } from './deliveries.gateway';
import { DeliveriesService } from './deliveries.service';
import { NotificationsService } from '../notifications/notifications.service';

const ENTREGADOR = { id: 7 } as User;

interface Cenario {
  service: DeliveriesService;
  criarLancamento: jest.Mock;
  transacao: jest.Mock;
}

function build(paymentMethod: PaymentMethodEnum, settledOffPlatform = false): Cenario {
  const criarLancamento = jest.fn().mockReturnValue({ __lancamento: true });
  const transacao = jest.fn().mockResolvedValue([]);

  const prisma = {
    foodOrder: {
      findUnique: jest.fn().mockResolvedValue({
        id: 42,
        deliveryFee: new Prisma.Decimal('8.00'),
        tip: new Prisma.Decimal('2.00'),
        customerId: 1,
        paymentMethod,
        settledOffPlatform,
      }),
      update: jest.fn().mockReturnValue({}),
    },
    deliveryAssignment: { update: jest.fn().mockReturnValue({}) },
    financialTransaction: { create: criarLancamento },
    $transaction: transacao,
  } as unknown as PrismaService;

  const gateway = { emitStatusChange: jest.fn() } as unknown as DeliveriesGateway;
  const notifications = { notifyUser: jest.fn() } as unknown as NotificationsService;

  const service = new DeliveriesService(prisma, gateway, notifications);

  jest.spyOn(service as never, 'findRawById').mockResolvedValue({
    id: 1,
    courierId: ENTREGADOR.id,
    foodOrderId: 42,
    status: DeliveryAssignmentStatusEnum.PickedUp,
  } as never);
  jest.spyOn(service, 'findById').mockResolvedValue({ id: 1 } as never);

  return { service, criarLancamento, transacao };
}

describe('deliveries.deliver — repasse ao entregador', () => {
  it('credita frete e gorjeta no pedido pago pelo gateway', async () => {
    const { service, criarLancamento } = build(PaymentMethodEnum.Pix);

    await service.deliver(ENTREGADOR, 1);

    expect(criarLancamento).toHaveBeenCalledTimes(1);

    const { data } = criarLancamento.mock.calls[0][0];
    expect(data.category).toBe(FinancialTransactionCategoryEnum.DeliveryPayout);
    expect(data.amount.toFixed(2)).toBe('10.00');
    expect(data.userId).toBe(ENTREGADOR.id);
  });

  it('não credita repasse em pedido pago em dinheiro', async () => {
    // O entregador recebeu frete e gorjeta em mãos; a plataforma não reteve
    // nada para repassar. Creditar aqui pagaria o mesmo dinheiro duas vezes.
    const { service, criarLancamento } = build(PaymentMethodEnum.Cash, true);

    await service.deliver(ENTREGADOR, 1);

    expect(criarLancamento).not.toHaveBeenCalled();
  });

  it('finaliza a entrega normalmente mesmo sem repasse', async () => {
    const { service, transacao } = build(PaymentMethodEnum.Cash, true);

    await service.deliver(ENTREGADOR, 1);

    // Duas operações: a entrega e o pedido. Sem a terceira, o lançamento.
    expect(transacao).toHaveBeenCalledTimes(1);
    expect(transacao.mock.calls[0][0]).toHaveLength(2);
  });

  it('mantém as três operações quando há repasse', async () => {
    const { service, transacao } = build(PaymentMethodEnum.CreditCard);

    await service.deliver(ENTREGADOR, 1);

    expect(transacao.mock.calls[0][0]).toHaveLength(3);
  });
});

describe('deliveries.deliver — maquininha do estabelecimento', () => {
  it('não credita repasse quando o cartão foi cobrado na maquininha', async () => {
    // O dinheiro não passou pela plataforma: quem deve frete e gorjeta ao
    // entregador é o estabelecimento, que aceitou essa responsabilidade.
    const { service, criarLancamento } = build(PaymentMethodEnum.CreditCard, true);

    await service.deliver(ENTREGADOR, 1);

    expect(criarLancamento).not.toHaveBeenCalled();
  });

  it('credita normalmente o cartão que passou pelo gateway', async () => {
    const { service, criarLancamento } = build(PaymentMethodEnum.CreditCard, false);

    await service.deliver(ENTREGADOR, 1);

    expect(criarLancamento).toHaveBeenCalledTimes(1);
  });
});
