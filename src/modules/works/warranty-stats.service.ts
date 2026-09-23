import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { WarrantyRequestStatus, WorkStatusEnum } from '@prisma/client';

export interface WarrantyStats {
  /** Acionamentos de garantia recebidos, aprovados ou não. */
  warrantiesTotal: number;
  warrantiesApproved: number;
  warrantiesRejected: number;
  /** Acionamentos aguardando resposta do fornecedor. */
  warrantiesPending: number;
  /** Reparos concluídos — é o número que o perfil chama de "atendidas" (Q-H). */
  warrantiesCompleted: number;
  /** Reparos abertos ou em andamento. */
  warrantiesInProgress: number;
}

const ZERADO: WarrantyStats = {
  warrantiesTotal: 0,
  warrantiesApproved: 0,
  warrantiesRejected: 0,
  warrantiesPending: 0,
  warrantiesCompleted: 0,
  warrantiesInProgress: 0,
};

/**
 * Contador de garantias por fornecedor (BE-W7).
 *
 * O perfil mostrava "Garantias totais/atendidas" fixo em zero porque não havia
 * de onde tirar o número. Ele sai de duas fontes que já existem:
 *
 * - **acionamentos** — o `warrantyRequestStatus` gravado no trabalho original;
 * - **reparos** — os Works de garantia criados quando o fornecedor aprova.
 *
 * "Atendida" é o **reparo concluído** (Q-H), não o acionamento aprovado: para
 * quem lê o perfil, atendida significa problema resolvido. Aprovado só indica
 * intenção, e fica como detalhe secundário.
 *
 * Calculado na hora, com dois `groupBy`. Não desnormalizo: o volume é baixo e
 * um contador materializado seria mais uma coisa para sair de sincronia.
 */
@Injectable()
export class WarrantyStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async statsFor(providerId: number): Promise<WarrantyStats> {
    const porFornecedor = await this.statsForMany([providerId]);

    return porFornecedor.get(providerId) ?? { ...ZERADO };
  }

  async statsForMany(providerIds: number[]): Promise<Map<number, WarrantyStats>> {
    const ids = [...new Set(providerIds)].filter((id) => Number.isInteger(id) && id > 0);
    const resultado = new Map<number, WarrantyStats>();

    if (!ids.length) return resultado;

    const [acionamentos, reparos] = await Promise.all([
      this.prisma.work.groupBy({
        by: ['providerId', 'warrantyRequestStatus'],
        where: {
          providerId: { in: ids },
          warrantyRequestStatus: { not: null },
          // Acionamento só conta no trabalho original. Hoje `requestWarranty`
          // recusa acionar um reparo (Q-G), mas filtrar aqui mantém o número
          // correto se essa regra for afrouxada depois.
          isWarranty: false,
        },
        _count: { _all: true },
      }),
      this.prisma.work.groupBy({
        by: ['providerId', 'status'],
        where: { providerId: { in: ids }, isWarranty: true },
        _count: { _all: true },
      }),
    ]);

    for (const id of ids) resultado.set(id, { ...ZERADO });

    for (const linha of acionamentos) {
      const stats = resultado.get(linha.providerId);
      if (!stats) continue;

      const quantidade = linha._count._all;
      stats.warrantiesTotal += quantidade;

      if (linha.warrantyRequestStatus === WarrantyRequestStatus.Approved) {
        stats.warrantiesApproved += quantidade;
      } else if (linha.warrantyRequestStatus === WarrantyRequestStatus.Rejected) {
        stats.warrantiesRejected += quantidade;
      } else {
        stats.warrantiesPending += quantidade;
      }
    }

    for (const linha of reparos) {
      const stats = resultado.get(linha.providerId);
      if (!stats) continue;

      const quantidade = linha._count._all;

      if (linha.status === WorkStatusEnum.Finished) {
        stats.warrantiesCompleted += quantidade;
      } else if (
        linha.status === WorkStatusEnum.Pending ||
        linha.status === WorkStatusEnum.InProgress
      ) {
        stats.warrantiesInProgress += quantidade;
      }
    }

    return resultado;
  }
}
