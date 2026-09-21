import { PrismaService } from '@database/PrismaService';
import { Prisma } from '@prisma/client';

import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentReferenceTypeEnum } from '../works/enums/payment-reference-type.enum';
import { PaymentStatusEnum } from '../works/enums/payment-status.enum';
import { WebhooksService } from './webhooks.service';

const PAGAMENTO = {
  id: 10,
  status: PaymentStatusEnum.Pending,
  referenceType: PaymentReferenceTypeEnum.FoodOrder,
  referenceId: 42,
  amount: new Prisma.Decimal('50.00'),
  payerId: 1,
  receiverId: 2,
  externalReference: 'ext-1',
  platformFeeAmount: null,
};

interface Cenario {
  service: WebhooksService;
  atualizarPagamento: jest.Mock;
  criarLancamentos: jest.Mock;
  atualizarPedido: jest.Mock;
  avisar: jest.Mock;
}

function build(opcoes: {
  mpStatus: string;
  linhasAfetadas?: number;
  statusLocal?: string;
}): Cenario {
  const atualizarPagamento = jest.fn().mockResolvedValue({ count: opcoes.linhasAfetadas ?? 1 });
  const criarLancamentos = jest.fn().mockResolvedValue({});
  const atualizarPedido = jest.fn().mockResolvedValue({});
  const avisar = jest.fn().mockResolvedValue(undefined);

  const tx = {
    payment: { updateMany: atualizarPagamento, update: jest.fn() },
    foodOrder: { update: atualizarPedido },
    financialTransaction: { createMany: criarLancamentos },
  };

  const prisma = {
    payment: {
      findUnique: jest.fn().mockResolvedValue({
        ...PAGAMENTO,
        status: opcoes.statusLocal ?? PaymentStatusEnum.Pending,
      }),
      updateMany: atualizarPagamento,
    },
    foodOrder: {
      findUnique: jest.fn().mockResolvedValue({
        id: 42,
        status: 'Delivered',
        itemsValue: new Prisma.Decimal('40.00'),
        deliveryFee: new Prisma.Decimal('10.00'),
      }),
      update: atualizarPedido,
    },
    $transaction: (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
  } as unknown as PrismaService;

  const mercadoPago = {
    verifySignature: () => true,
    getPayment: jest
      .fn()
      .mockResolvedValue({ id: 'MP1', status: opcoes.mpStatus, external_reference: 'ext-1' }),
    mapPaymentMethod: () => 'Pix',
  } as unknown as MercadoPagoService;

  const notifications = { notifyUser: avisar } as unknown as NotificationsService;

  return {
    service: new WebhooksService(prisma, mercadoPago, notifications),
    atualizarPagamento,
    criarLancamentos,
    atualizarPedido,
    avisar,
  };
}

async function notificar(service: WebhooksService) {
  await service.handleMercadoPagoNotification(
    { type: 'payment', data: { id: 'MP1' } },
    {},
    'assinatura',
    'req-1',
  );
}

describe('webhook — idempotência da confirmação', () => {
  it('confirma condicionando ao status, e não por leitura prévia', async () => {
    const { service, atualizarPagamento } = build({ mpStatus: 'approved' });

    await notificar(service);

    expect(atualizarPagamento.mock.calls[0][0].where).toEqual({
      id: PAGAMENTO.id,
      status: { not: PaymentStatusEnum.Paid },
    });
  });

  it('não lança nada no razão quando outra notificação chegou primeiro', async () => {
    // O UPDATE alcançou zero linhas: alguém já confirmou. Sem a trava, as duas
    // notificações gravavam crédito e débito, dobrando o extrato.
    const { service, criarLancamentos } = build({ mpStatus: 'approved', linhasAfetadas: 0 });

    await notificar(service);

    expect(criarLancamentos).not.toHaveBeenCalled();
  });

  it('não propaga erro no webhook duplicado: o Mercado Pago reenviaria para sempre', async () => {
    const { service } = build({ mpStatus: 'approved', linhasAfetadas: 0 });

    await expect(notificar(service)).resolves.toBeUndefined();
  });
});

describe('webhook — estorno e contestação', () => {
  for (const mpStatus of ['refunded', 'charged_back']) {
    it(`marca o pagamento como Refunded em ${mpStatus}`, async () => {
      const { service, atualizarPagamento } = build({
        mpStatus,
        statusLocal: PaymentStatusEnum.Paid,
      });

      await notificar(service);

      expect(atualizarPagamento).toHaveBeenCalledWith({
        where: { id: PAGAMENTO.id, status: { not: PaymentStatusEnum.Refunded } },
        data: { status: PaymentStatusEnum.Refunded },
      });
    });
  }

  it('marca o pedido como estornado', async () => {
    const { service, atualizarPedido } = build({
      mpStatus: 'refunded',
      statusLocal: PaymentStatusEnum.Paid,
    });

    await notificar(service);

    expect(atualizarPedido).toHaveBeenCalledWith({
      where: { id: PAGAMENTO.referenceId },
      data: { paymentStatus: PaymentStatusEnum.Refunded },
    });
  });

  it('NÃO reverte lançamento nenhum: a regra de quem fica sem receber não existe', async () => {
    const { service, criarLancamentos } = build({
      mpStatus: 'refunded',
      statusLocal: PaymentStatusEnum.Paid,
    });

    await notificar(service);

    expect(criarLancamentos).not.toHaveBeenCalled();
  });

  it('avisa quem recebeu o dinheiro', async () => {
    const { service, avisar } = build({
      mpStatus: 'refunded',
      statusLocal: PaymentStatusEnum.Paid,
    });

    await notificar(service);

    expect(avisar).toHaveBeenCalledWith(PAGAMENTO.receiverId, expect.stringContaining('devolvido'));
  });

  it('processa o estorno mesmo com o pagamento já pago localmente', async () => {
    // O atalho que existe no topo pula pagamento `Paid` — se ele valesse para
    // o estorno, nenhum chargeback seria registrado, porque todo chargeback
    // vem depois de uma aprovação.
    const { service, atualizarPedido } = build({
      mpStatus: 'refunded',
      statusLocal: PaymentStatusEnum.Paid,
    });

    await notificar(service);

    expect(atualizarPedido).toHaveBeenCalled();
  });

  it('ignora o estorno repetido', async () => {
    const { service, atualizarPedido } = build({
      mpStatus: 'refunded',
      statusLocal: PaymentStatusEnum.Paid,
      linhasAfetadas: 0,
    });

    await notificar(service);

    expect(atualizarPedido).not.toHaveBeenCalled();
  });
});

describe('webhook — estados de trânsito', () => {
  for (const mpStatus of ['in_process', 'in_mediation']) {
    it(`não mexe em nada em ${mpStatus}`, async () => {
      const { service, atualizarPagamento, atualizarPedido } = build({ mpStatus });

      await notificar(service);

      expect(atualizarPagamento).not.toHaveBeenCalled();
      expect(atualizarPedido).not.toHaveBeenCalled();
    });
  }
});
