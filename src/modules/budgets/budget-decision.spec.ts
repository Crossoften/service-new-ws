import { PrismaService } from '@database/PrismaService';
import { Role, User } from '@prisma/client';

import { BudgetsService } from './budgets.service';
import { BudgetStatusEnum } from './enums/budget-status.enum';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { BudgetApprovalNotAllowedException } from './exceptions/budget-approval-not-allowed.exception';
import { BudgetLockedAfterApprovalException } from './exceptions/budget-locked-after-approval.exception';
import { BudgetNotRespondedException } from './exceptions/budget-not-responded.exception';

const CLIENTE = { id: 1, role: Role.User } as User;
const PRESTADOR = { id: 2, role: Role.User } as User;

interface Cenario {
  service: BudgetsService;
  update: jest.Mock;
}

function build(orcamento: Record<string, unknown>): Cenario {
  const update = jest.fn().mockResolvedValue({ id: 1 });

  const prisma = {
    budget: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        requesterId: CLIENTE.id,
        providerId: PRESTADOR.id,
        status: BudgetStatusEnum.Responded,
        work: null,
        ...orcamento,
      }),
      update,
    },
  } as unknown as PrismaService;

  const service = new BudgetsService(prisma, {} as SubscriptionGuardService);

  jest.spyOn(service, 'findById').mockResolvedValue({ id: 1 } as never);

  return { service, update };
}

describe('budgets.reject — o cliente recusa a proposta', () => {
  it('marca como Rejected com data e motivo', async () => {
    const { service, update } = build({});

    await service.reject(CLIENTE, 1, { rejectReason: '  prazo longo demais  ' });

    const { data } = update.mock.calls[0][0];
    expect(data.status).toBe(BudgetStatusEnum.Rejected);
    expect(data.rejectedAt).toBeInstanceOf(Date);
    expect(data.rejectReason).toBe('prazo longo demais');
  });

  it('aceita recusa sem motivo', async () => {
    const { service, update } = build({});

    await service.reject(CLIENTE, 1, {});

    expect(update.mock.calls[0][0].data.rejectReason).toBeNull();
  });

  it('só quem solicitou pode recusar', async () => {
    // Recusar a própria proposta não faz sentido; o prestador que desistiu tem
    // outro caminho.
    const { service, update } = build({});

    await expect(service.reject(PRESTADOR, 1, {})).rejects.toBeInstanceOf(
      BudgetApprovalNotAllowedException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('não recusa o que ainda não foi respondido', async () => {
    const { service } = build({ status: BudgetStatusEnum.Pending });

    await expect(service.reject(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      BudgetNotRespondedException,
    );
  });

  it('não recusa o que já virou trabalho', async () => {
    const { service } = build({ work: { id: 9 }, status: BudgetStatusEnum.Accepted });

    await expect(service.reject(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      BudgetLockedAfterApprovalException,
    );
  });

  it('não recusa duas vezes', async () => {
    const { service } = build({ status: BudgetStatusEnum.Rejected });

    await expect(service.reject(CLIENTE, 1, {})).rejects.toBeInstanceOf(
      BudgetNotRespondedException,
    );
  });
});

describe('budgets.update — estados terminais', () => {
  it('recusa alterar orçamento aceito', async () => {
    const { service, update } = build({ status: BudgetStatusEnum.Accepted });

    await expect(service.update(PRESTADOR, 1, { responseValue: 900 })).rejects.toBeInstanceOf(
      BudgetLockedAfterApprovalException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('recusa alterar orçamento recusado: reabrir seria contraproposta', async () => {
    const { service } = build({ status: BudgetStatusEnum.Rejected });

    await expect(service.update(PRESTADOR, 1, { responseValue: 700 })).rejects.toBeInstanceOf(
      BudgetLockedAfterApprovalException,
    );
  });

  it('continua permitindo alterar o que está em negociação', async () => {
    const { service, update } = build({ status: BudgetStatusEnum.Responded });

    await service.update(PRESTADOR, 1, { responseValue: 700 });

    expect(update).toHaveBeenCalledTimes(1);
  });
});
