import { PrismaService } from '@database/PrismaService';
import { Prisma, User, WarrantyRequestStatus } from '@prisma/client';

import { MarketplaceFeeService } from '../../src/modules/mercado-pago/marketplace-fee.service';
import { MercadoPagoAccountsService } from '../../src/modules/mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../../src/modules/mercado-pago/mercado-pago.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { WorksService } from '../../src/modules/works/works.service';
import { criarServico, criarUsuario, limparBanco, prisma } from './db';

/**
 * O reparo em garantia mexe em três coisas que só o banco valida: a coluna
 * `budgetId` que passou a aceitar `NULL` **mantendo o índice único**, a chave
 * estrangeira auto-relacional `parentWorkId`, e a criação de Work + ChatRoom
 * na mesma transação.
 */
describe('reparo em garantia, contra o banco', () => {
  let service: WorksService;
  let fornecedor: { id: number };
  let cliente: { id: number };
  let trabalhoId: number;
  let servicoId: number;

  function build() {
    return new WorksService(
      prisma as unknown as PrismaService,
      {} as MercadoPagoService,
      {} as MercadoPagoAccountsService,
      {} as MarketplaceFeeService,
      { notifyUser: jest.fn() } as unknown as NotificationsService,
    );
  }

  async function criarTrabalhoComGarantiaAcionada() {
    const budget = await prisma.budget.create({
      data: {
        status: 'Accepted',
        serviceId: servicoId,
        requesterId: cliente.id,
        providerId: fornecedor.id,
      },
      select: { id: true },
    });

    const work = await prisma.work.create({
      data: {
        status: 'Finished',
        budgetId: budget.id,
        serviceId: servicoId,
        requesterId: cliente.id,
        providerId: fornecedor.id,
        serviceValue: new Prisma.Decimal('300.00'),
        totalValue: new Prisma.Decimal('300.00'),
        warrantyExpiresAt: new Date(Date.now() + 30 * 86400000),
        warrantyRequestedAt: new Date(),
        warrantyRequestDescription: 'a torneira voltou a vazar',
        warrantyRequestStatus: WarrantyRequestStatus.Pending,
      },
      select: { id: true },
    });

    return work.id;
  }

  beforeEach(async () => {
    await limparBanco();

    fornecedor = await criarUsuario('Fornecedor');
    cliente = await criarUsuario('Cliente');
    const servico = await criarServico(fornecedor.id);
    servicoId = servico.id;
    trabalhoId = await criarTrabalhoComGarantiaAcionada();

    service = build();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('aprovar a garantia cria o reparo ligado ao original', async () => {
    await service.respondWarranty({ ...fornecedor, role: 'User' } as User, trabalhoId, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    const reparo = await prisma.work.findFirst({ where: { isWarranty: true } });

    expect(reparo).toBeTruthy();
    expect(reparo?.parentWorkId).toBe(trabalhoId);
    expect(reparo?.budgetId).toBeNull();
    expect(reparo?.serviceValue?.toFixed(2)).toBe('0.00');
    expect(reparo?.status).toBe('Pending');
  });

  it('abre a sala de chat do reparo na mesma transação', async () => {
    await service.respondWarranty({ ...fornecedor, role: 'User' } as User, trabalhoId, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    const reparo = await prisma.work.findFirst({ where: { isWarranty: true } });
    const sala = await prisma.chatRoom.findUnique({
      where: {
        contextType_referenceId: { contextType: 'Work', referenceId: reparo!.id },
      },
      include: { participants: true },
    });

    expect(sala).toBeTruthy();
    expect(sala?.participants.map((p) => p.userId).sort()).toEqual(
      [cliente.id, fornecedor.id].sort(),
    );
  });

  it('vários reparos convivem com budgetId nulo, apesar do índice único', async () => {
    // A migration afirma que "em MySQL o índice único aceita vários NULL".
    // Esta é a prova: dois reparos, os dois sem orçamento, na mesma tabela.
    await service.respondWarranty({ ...fornecedor, role: 'User' } as User, trabalhoId, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    const segundoTrabalho = await criarTrabalhoComGarantiaAcionada();

    await service.respondWarranty({ ...fornecedor, role: 'User' } as User, segundoTrabalho, {
      status: WarrantyRequestStatus.Approved,
    } as never);

    const reparos = await prisma.work.findMany({ where: { isWarranty: true } });

    expect(reparos).toHaveLength(2);
    expect(reparos.every((r) => r.budgetId === null)).toBe(true);
  });

  it('recusar não cria reparo nenhum', async () => {
    await service.respondWarranty({ ...fornecedor, role: 'User' } as User, trabalhoId, {
      status: WarrantyRequestStatus.Rejected,
    } as never);

    expect(await prisma.work.count({ where: { isWarranty: true } })).toBe(0);
    const original = await prisma.work.findUnique({ where: { id: trabalhoId } });
    expect(original?.warrantyRequestStatus).toBe('Rejected');
  });

  it('responder duas vezes não cria dois reparos', async () => {
    const responder = () =>
      service.respondWarranty({ ...fornecedor, role: 'User' } as User, trabalhoId, {
        status: WarrantyRequestStatus.Approved,
      } as never);

    await Promise.allSettled([responder(), responder()]);

    expect(await prisma.work.count({ where: { isWarranty: true } })).toBe(1);
  });
});
