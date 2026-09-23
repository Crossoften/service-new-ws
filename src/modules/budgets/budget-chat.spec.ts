import { PrismaService } from '@database/PrismaService';
import { ChatContextType, Role, User } from '@prisma/client';

import { BudgetsService } from './budgets.service';
import { BudgetStatusEnum } from './enums/budget-status.enum';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';

const CLIENTE = { id: 1, role: Role.User } as User;
const PRESTADOR_ID = 2;

interface Cenario {
  service: BudgetsService;
  criarSala: jest.Mock;
  moverSala: jest.Mock;
  buscarSala: jest.Mock;
}

function build(salaDoOrcamento: { id: number } | null = { id: 55 }): Cenario {
  const criarSala = jest.fn().mockResolvedValue({ id: 70 });
  const moverSala = jest.fn().mockResolvedValue({});
  const buscarSala = jest.fn().mockResolvedValue(salaDoOrcamento);

  const tx = {
    budget: {
      create: jest.fn().mockResolvedValue({
        id: 9,
        files: [],
        service: {},
        requester: {},
        provider: {},
        informationRequests: [],
      }),
      update: jest.fn(),
    },
    work: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 40, files: [], service: {}, requester: {}, provider: {} }),
    },
    chatRoom: { create: criarSala, findUnique: buscarSala, update: moverSala },
  };

  const prisma = {
    service: {
      findUnique: jest.fn().mockResolvedValue({ id: 3, userId: PRESTADOR_ID, isActive: true }),
    },
    budget: {
      findUnique: jest.fn().mockResolvedValue({
        id: 9,
        status: BudgetStatusEnum.Responded,
        description: 'trocar a torneira',
        responseValue: null,
        serviceId: 3,
        requesterId: CLIENTE.id,
        providerId: PRESTADOR_ID,
        files: [],
        work: null,
      }),
    },
    chatRoom: { findMany: jest.fn().mockResolvedValue([]), findUnique: buscarSala },
    $transaction: (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
  } as unknown as PrismaService;

  const guard = { assertProviderCanSell: jest.fn() } as unknown as SubscriptionGuardService;

  return { service: new BudgetsService(prisma, guard), criarSala, moverSala, buscarSala };
}

describe('budgets.create — chat nasce com o orçamento (BE-CHAT-1)', () => {
  it('abre uma sala de contexto Budget', async () => {
    const { service, criarSala } = build();

    await service.create(CLIENTE, { serviceId: 3, description: 'trocar a torneira' } as never);

    const { data } = criarSala.mock.calls[0][0];
    expect(data.contextType).toBe(ChatContextType.Budget);
    expect(data.referenceId).toBe(9);
  });

  it('coloca cliente e prestador na conversa', async () => {
    const { service, criarSala } = build();

    await service.create(CLIENTE, { serviceId: 3 } as never);

    const participantes = criarSala.mock.calls[0][0].data.participants.create;
    expect(participantes.map((p: { userId: number }) => p.userId).sort()).toEqual([
      CLIENTE.id,
      PRESTADOR_ID,
    ]);
  });

  it('marca como lida para quem abriu: ele acabou de escrever', async () => {
    const { service, criarSala } = build();

    await service.create(CLIENTE, { serviceId: 3 } as never);

    const participantes = criarSala.mock.calls[0][0].data.participants.create;
    const autor = participantes.find((p: { userId: number }) => p.userId === CLIENTE.id);
    expect(autor.lastReadAt).toBeInstanceOf(Date);
  });
});

describe('budgets.approve — a conversa continua (Q-UX1)', () => {
  it('move a sala do orçamento para o trabalho, sem criar outra', async () => {
    const { service, moverSala, criarSala } = build({ id: 55 });

    await service.approve(CLIENTE, 9);

    expect(moverSala).toHaveBeenCalledWith({
      where: { id: 55 },
      data: { contextType: ChatContextType.Work, referenceId: 40 },
    });
    expect(criarSala).not.toHaveBeenCalled();
  });

  it('preserva o id da sala: o front não troca de conversa ao aprovar', async () => {
    const { service, moverSala } = build({ id: 55 });

    await service.approve(CLIENTE, 9);

    expect(moverSala.mock.calls[0][0].where.id).toBe(55);
  });

  it('cria a sala no aceite quando o orçamento é anterior a esta fase', async () => {
    // Orçamentos que já estavam no banco não têm sala de contexto Budget.
    const { service, criarSala, moverSala } = build(null);

    await service.approve(CLIENTE, 9);

    expect(moverSala).not.toHaveBeenCalled();
    expect(criarSala.mock.calls[0][0].data.contextType).toBe(ChatContextType.Work);
    expect(criarSala.mock.calls[0][0].data.referenceId).toBe(40);
  });
});
