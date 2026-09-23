import { PrismaService } from '@database/PrismaService';
import { Role, User, WarrantyRequestStatus } from '@prisma/client';

import { MarketplaceFeeService } from '../mercado-pago/marketplace-fee.service';
import { MercadoPagoAccountsService } from '../mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkStatusEnum } from './enums/work-status.enum';
import { WorkWarrantyNotChargeableException } from './exceptions/work-warranty-not-chargeable.exception';
import { WorkWarrantyNotNestableException } from './exceptions/work-warranty-not-nestable.exception';
import { WorkUpdateFailedException } from './exceptions/work-update-failed.exception';
import { WorksService } from './works.service';

const FORNECEDOR = { id: 2, role: Role.User } as User;
const CLIENTE = { id: 1, role: Role.User } as User;

const TRABALHO = {
  id: 10,
  providerId: FORNECEDOR.id,
  requesterId: CLIENTE.id,
  serviceId: 3,
  warrantyRequestStatus: WarrantyRequestStatus.Pending,
  warrantyRequestDescription: 'a torneira voltou a vazar',
  files: [],
};

interface Cenario {
  service: WorksService;
  responder: jest.Mock;
  criarWork: jest.Mock;
  criarChat: jest.Mock;
}

function build(trabalho: Record<string, unknown> = {}, linhasAfetadas = 1): Cenario {
  // `updateMany` condicionado a `Pending` é o que torna a resposta idempotente
  // de verdade: zero linhas significa que outra resposta chegou primeiro.
  const responder = jest.fn().mockResolvedValue({ count: linhasAfetadas });
  const criarWork = jest.fn().mockResolvedValue({ id: 99 });
  const criarChat = jest.fn().mockResolvedValue({});

  const tx = {
    work: { updateMany: responder, create: criarWork },
    chatRoom: { create: criarChat },
  };

  const prisma = {
    work: {
      findUnique: jest.fn().mockResolvedValue({ ...TRABALHO, ...trabalho }),
      updateMany: responder,
    },
    $transaction: (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
  } as unknown as PrismaService;

  const service = new WorksService(
    prisma,
    {} as MercadoPagoService,
    {} as MercadoPagoAccountsService,
    {} as MarketplaceFeeService,
    {} as NotificationsService,
  );

  jest.spyOn(service, 'findById').mockResolvedValue({ id: 10 } as never);

  return { service, responder, criarWork, criarChat };
}

describe('respondWarranty — aprovação cria o reparo', () => {
  it('cria um Work de garantia ligado ao original', async () => {
    const { service, criarWork } = build();

    await service.respondWarranty(FORNECEDOR, 10, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    const { data } = criarWork.mock.calls[0][0];
    expect(data.parentWorkId).toBe(TRABALHO.id);
    expect(data.isWarranty).toBe(true);
    expect(data.status).toBe(WorkStatusEnum.Pending);
    expect(data.providerId).toBe(FORNECEDOR.id);
    expect(data.requesterId).toBe(CLIENTE.id);
    expect(data.serviceId).toBe(TRABALHO.serviceId);
  });

  it('nasce sem custo e sem orçamento', async () => {
    const { service, criarWork } = build();

    await service.respondWarranty(FORNECEDOR, 10, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    const { data } = criarWork.mock.calls[0][0];
    expect(data.budgetId).toBeNull();
    expect(data.serviceValue.toFixed(2)).toBe('0.00');
    expect(data.totalValue.toFixed(2)).toBe('0.00');
  });

  it('leva a descrição do acionamento para o reparo', async () => {
    const { service, criarWork } = build();

    await service.respondWarranty(FORNECEDOR, 10, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    expect(criarWork.mock.calls[0][0].data.details).toContain('a torneira voltou a vazar');
    expect(criarWork.mock.calls[0][0].data.details).toContain('#10');
  });

  it('copia os anexos do acionamento como anexos do cliente', async () => {
    const { service, criarWork } = build({
      files: [{ fileName: 'foto.jpg', fileUrl: 'https://x/foto.jpg', fileKey: 'k' }],
    });

    await service.respondWarranty(FORNECEDOR, 10, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    const anexos = criarWork.mock.calls[0][0].data.files.create;
    expect(anexos).toHaveLength(1);
    expect(anexos[0]).toMatchObject({ fileName: 'foto.jpg', type: 'Requester' });
  });

  it('abre chat próprio para o reparo (Q-F)', async () => {
    const { service, criarChat } = build();

    await service.respondWarranty(FORNECEDOR, 10, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    expect(criarChat).toHaveBeenCalledTimes(1);
    expect(criarChat.mock.calls[0][0].data.referenceId).toBe(99);
  });
});

describe('respondWarranty — recusa', () => {
  it('registra e não cria nada', async () => {
    const { service, criarWork, criarChat } = build();

    await service.respondWarranty(FORNECEDOR, 10, {
      status: WarrantyRequestStatus.Rejected,
    } as never);

    expect(criarWork).not.toHaveBeenCalled();
    expect(criarChat).not.toHaveBeenCalled();
  });
});

describe('respondWarranty — idempotência', () => {
  it('recusa responder acionamento que já foi respondido', async () => {
    // Sem esta trava, dois toques no botão criariam dois reparos para o mesmo
    // acionamento.
    const { service, criarWork } = build({
      warrantyRequestStatus: WarrantyRequestStatus.Approved,
    });

    await expect(
      service.respondWarranty(FORNECEDOR, 10, {
        status: WarrantyRequestStatus.Approved,
      } as never),
    ).rejects.toBeInstanceOf(WorkUpdateFailedException);

    expect(criarWork).not.toHaveBeenCalled();
  });
});

describe('travas do reparo em garantia', () => {
  it('não aceita garantia de garantia (Q-G)', async () => {
    const { service } = build({
      isWarranty: true,
      status: WorkStatusEnum.Finished,
      warrantyExpiresAt: new Date(Date.now() + 86400000),
      warrantyRequestStatus: null,
    });

    await expect(
      service.requestWarranty(CLIENTE, 10, { description: 'de novo' } as never),
    ).rejects.toBeInstanceOf(WorkWarrantyNotNestableException);
  });

  it('não gera pagamento (Q-E)', async () => {
    const { service } = build({ isWarranty: true, status: WorkStatusEnum.Finished });

    await expect(service.pay(CLIENTE, 10, {} as never)).rejects.toBeInstanceOf(
      WorkWarrantyNotChargeableException,
    );
  });

  it('não aceita pedido de adicional', async () => {
    const { service } = build({ isWarranty: true, status: WorkStatusEnum.InProgress });

    await expect(
      service.requestExtra(FORNECEDOR, 10, { value: 100, description: 'x' } as never),
    ).rejects.toBeInstanceOf(WorkWarrantyNotChargeableException);
  });
});

describe('respondWarranty — corrida entre duas respostas', () => {
  it('desfaz a transação quando outra resposta chegou primeiro', async () => {
    // A guarda real é o `updateMany` condicionado: alcançar zero linhas
    // significa que o acionamento já saiu de `Pending`. A leitura anterior,
    // fora da transação, deixava as duas passarem — e criava dois reparos.
    const { service, criarWork } = build({}, 0);

    await expect(
      service.respondWarranty(FORNECEDOR, 10, {
        status: WarrantyRequestStatus.Approved,
      } as never),
    ).rejects.toBeInstanceOf(WorkUpdateFailedException);

    expect(criarWork).not.toHaveBeenCalled();
  });

  it('condiciona a gravação ao status Pending', async () => {
    const { service, responder } = build();

    await service.respondWarranty(FORNECEDOR, 10, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    expect(responder.mock.calls[0][0].where).toEqual({
      id: 10,
      warrantyRequestStatus: WarrantyRequestStatus.Pending,
    });
  });
});
