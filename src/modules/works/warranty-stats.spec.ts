import { PrismaService } from '@database/PrismaService';
import { WarrantyRequestStatus, WorkStatusEnum } from '@prisma/client';

import { WarrantyStatsService } from './warranty-stats.service';

function build(acionamentos: unknown[], reparos: unknown[]) {
  const groupBy = jest.fn().mockResolvedValueOnce(acionamentos).mockResolvedValueOnce(reparos);

  const prisma = { work: { groupBy } } as unknown as PrismaService;

  return { service: new WarrantyStatsService(prisma), groupBy };
}

const acionamento = (status: WarrantyRequestStatus, quantidade: number, providerId = 2) => ({
  providerId,
  warrantyRequestStatus: status,
  _count: { _all: quantidade },
});

const reparo = (status: WorkStatusEnum, quantidade: number, providerId = 2) => ({
  providerId,
  status,
  _count: { _all: quantidade },
});

describe('WarrantyStatsService', () => {
  it('soma acionamentos por desfecho', async () => {
    const { service } = build(
      [
        acionamento(WarrantyRequestStatus.Approved, 5),
        acionamento(WarrantyRequestStatus.Rejected, 1),
        acionamento(WarrantyRequestStatus.Pending, 2),
      ],
      [],
    );

    const stats = await service.statsFor(2);

    expect(stats.warrantiesTotal).toBe(8);
    expect(stats.warrantiesApproved).toBe(5);
    expect(stats.warrantiesRejected).toBe(1);
    expect(stats.warrantiesPending).toBe(2);
  });

  it('"atendidas" é reparo concluído, não acionamento aprovado (Q-H)', async () => {
    // Cinco aprovações, mas só três reparos terminados: o perfil mostra 3.
    const { service } = build(
      [acionamento(WarrantyRequestStatus.Approved, 5)],
      [reparo(WorkStatusEnum.Finished, 3), reparo(WorkStatusEnum.InProgress, 2)],
    );

    const stats = await service.statsFor(2);

    expect(stats.warrantiesApproved).toBe(5);
    expect(stats.warrantiesCompleted).toBe(3);
    expect(stats.warrantiesInProgress).toBe(2);
  });

  it('não conta reparo cancelado como concluído nem em aberto', async () => {
    const { service } = build([], [reparo(WorkStatusEnum.Cancelled, 4)]);

    const stats = await service.statsFor(2);

    expect(stats.warrantiesCompleted).toBe(0);
    expect(stats.warrantiesInProgress).toBe(0);
  });

  it('só conta acionamento no trabalho original', async () => {
    const { service, groupBy } = build([], []);

    await service.statsFor(2);

    expect(groupBy.mock.calls[0][0].where.isWarranty).toBe(false);
    expect(groupBy.mock.calls[1][0].where.isWarranty).toBe(true);
  });

  it('devolve zerado para fornecedor sem nenhuma garantia', async () => {
    const { service } = build([], []);

    expect(await service.statsFor(2)).toEqual({
      warrantiesTotal: 0,
      warrantiesApproved: 0,
      warrantiesRejected: 0,
      warrantiesPending: 0,
      warrantiesCompleted: 0,
      warrantiesInProgress: 0,
    });
  });

  it('separa os números por fornecedor', async () => {
    const { service } = build(
      [
        acionamento(WarrantyRequestStatus.Approved, 2, 2),
        acionamento(WarrantyRequestStatus.Approved, 7, 3),
      ],
      [reparo(WorkStatusEnum.Finished, 1, 2), reparo(WorkStatusEnum.Finished, 6, 3)],
    );

    const porFornecedor = await service.statsForMany([2, 3]);

    expect(porFornecedor.get(2)).toMatchObject({ warrantiesTotal: 2, warrantiesCompleted: 1 });
    expect(porFornecedor.get(3)).toMatchObject({ warrantiesTotal: 7, warrantiesCompleted: 6 });
  });

  it('não consulta o banco sem id válido', async () => {
    const { service, groupBy } = build([], []);

    expect(await service.statsForMany([])).toEqual(new Map());
    expect(groupBy).not.toHaveBeenCalled();
  });
});
