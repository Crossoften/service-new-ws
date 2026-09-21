import { PrismaService } from '@database/PrismaService';
import { Role, User } from '@prisma/client';

import { BudgetsService } from './budgets.service';
import { BudgetStatusEnum } from './enums/budget-status.enum';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { BudgetLockedAfterApprovalException } from './exceptions/budget-locked-after-approval.exception';

const REQUESTER = { id: 1, role: Role.User } as User;
const PROVIDER = { id: 2, role: Role.User } as User;
const ADMIN = { id: 9, role: Role.Admin } as User;

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
        requesterId: REQUESTER.id,
        providerId: PROVIDER.id,
        status: BudgetStatusEnum.Pending,
        work: null,
        ...orcamento,
      }),
      update,
    },
  } as unknown as PrismaService;

  const service = new BudgetsService(prisma, {} as SubscriptionGuardService);

  // `findById` recarrega o registro no fim do update e não é o que está sob
  // teste; o duplo evita ter que modelar o select inteiro.
  jest.spyOn(service, 'findById').mockResolvedValue({ id: 1 } as never);

  return { service, update };
}

describe('budgets.update — trava depois do aceite', () => {
  it('recusa alterar orçamento que já virou trabalho', async () => {
    const { service, update } = build({ work: { id: 77 } });

    await expect(service.update(PROVIDER, 1, { responseValue: 500 })).rejects.toBeInstanceOf(
      BudgetLockedAfterApprovalException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('recusa também para admin: não há como reconciliar os três registros', async () => {
    const { service } = build({ work: { id: 77 } });

    await expect(service.update(ADMIN, 1, { responseValue: 500 })).rejects.toBeInstanceOf(
      BudgetLockedAfterApprovalException,
    );
  });

  it('continua permitindo alterar orçamento ainda não aceito', async () => {
    const { service, update } = build({ work: null });

    await service.update(PROVIDER, 1, { responseValue: 500 });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.responseValue.toFixed(2)).toBe('500.00');
  });
});

describe('budgets.update — status', () => {
  it('deriva Responded da resposta, sem depender do que o cliente manda', async () => {
    const { service, update } = build({});

    await service.update(PROVIDER, 1, { responseValue: 300 });

    expect(update.mock.calls[0][0].data.status).toBe(BudgetStatusEnum.Responded);
  });

  it('ignora status forjado pelo cliente', async () => {
    const { service, update } = build({});

    // O requerente tentando marcar como respondido sem que o prestador tenha
    // respondido: o status enviado é descartado e a derivação manda.
    await service.update(REQUESTER, 1, {
      description: 'mais detalhes',
      status: BudgetStatusEnum.Responded,
    });

    expect(update.mock.calls[0][0].data.status).toBeUndefined();
  });

  it('aceita o cancelamento, que não tem rota própria', async () => {
    const { service, update } = build({});

    await service.update(REQUESTER, 1, { status: BudgetStatusEnum.Cancelled });

    expect(update.mock.calls[0][0].data.status).toBe(BudgetStatusEnum.Cancelled);
  });
});
