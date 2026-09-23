import { PrismaService } from '@database/PrismaService';
import { DeliveryPayoutMethodEnum, Prisma } from '@prisma/client';

import { AdminDeliveryPayoutsService } from '../../src/modules/admin/admin-delivery-payouts/admin-delivery-payouts.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { criarUsuario, limparBanco, prisma } from './db';

/**
 * A trava de concorrência do repasse — `UPDATE ... WHERE payoutId IS NULL` —
 * depende do bloqueio de linha do InnoDB. Teste unitário com duplo de Prisma
 * não prova nada disso: ele prova a lógica em volta, não o banco.
 *
 * Aqui dois repasses do mesmo entregador saem ao mesmo tempo, contra um MySQL
 * de verdade. O que está em jogo é dinheiro sair duas vezes.
 */
describe('repasse ao entregador — corrida entre dois admins', () => {
  let service: AdminDeliveryPayoutsService;
  let entregadorId: number;
  let adminId: number;

  const notificacoes = { notifyUser: jest.fn() } as unknown as NotificationsService;

  beforeAll(() => {
    service = new AdminDeliveryPayoutsService(prisma as unknown as PrismaService, notificacoes);
  });

  beforeEach(async () => {
    await limparBanco();

    const entregador = await criarUsuario('Entregador');
    const admin = await criarUsuario('Admin');
    entregadorId = entregador.id;
    adminId = admin.id;

    // Três entregas por repassar: R$ 8,00 + R$ 10,50 + R$ 6,00 = R$ 24,50.
    await prisma.financialTransaction.createMany({
      data: ['8.00', '10.50', '6.00'].map((valor, indice) => ({
        type: 'Credit' as const,
        category: 'DeliveryPayout' as const,
        status: 'Paid' as const,
        amount: new Prisma.Decimal(valor),
        availableAt: new Date(),
        referenceType: 'FoodOrder' as const,
        referenceId: 100 + indice,
        userId: entregadorId,
      })),
    });
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('soma o saldo em aberto a partir do razão', async () => {
    const [pendente] = await service.findPending();

    expect(pendente.courierId).toBe(entregadorId);
    expect(pendente.amount).toBe('24.50');
    expect(pendente.deliveries).toBe(3);
  });

  it('dois repasses simultâneos: um passa, o outro é recusado', async () => {
    const repasse = () =>
      service.create(adminId, {
        courierId: entregadorId,
        method: DeliveryPayoutMethodEnum.Pix,
      });

    const resultados = await Promise.allSettled([repasse(), repasse()]);

    const aceitos = resultados.filter((r) => r.status === 'fulfilled');
    const recusados = resultados.filter((r) => r.status === 'rejected');

    expect(aceitos).toHaveLength(1);
    expect(recusados).toHaveLength(1);
  });

  it('o entregador é pago uma vez só', async () => {
    const repasse = () =>
      service.create(adminId, {
        courierId: entregadorId,
        method: DeliveryPayoutMethodEnum.Pix,
      });

    await Promise.allSettled([repasse(), repasse()]);

    const lotes = await prisma.deliveryPayout.findMany();
    const saidas = await prisma.financialTransaction.findMany({
      where: { type: 'Debit', category: 'Withdrawal' },
    });

    expect(lotes).toHaveLength(1);
    expect(lotes[0].amount.toFixed(2)).toBe('24.50');
    expect(saidas).toHaveLength(1);
    expect(saidas[0].amount.toFixed(2)).toBe('24.50');
  });

  it('todos os créditos ficam ligados ao lote que os quitou', async () => {
    await service.create(adminId, {
      courierId: entregadorId,
      method: DeliveryPayoutMethodEnum.Pix,
    });

    const emAberto = await prisma.financialTransaction.count({
      where: { type: 'Credit', category: 'DeliveryPayout', payoutId: null },
    });

    expect(emAberto).toBe(0);
    expect(await service.findPending()).toEqual([]);
  });

  it('recusa quando o saldo mudou desde que a tela carregou', async () => {
    await expect(
      service.create(adminId, {
        courierId: entregadorId,
        method: DeliveryPayoutMethodEnum.Pix,
        expectedAmount: 20,
      }),
    ).rejects.toThrow(/24\.50/);

    // Nada foi liquidado: o saldo continua inteiro.
    const [pendente] = await service.findPending();
    expect(pendente.amount).toBe('24.50');
  });

  it('uma entrega concluída durante o repasse não some do saldo', async () => {
    const repasse = service.create(adminId, {
      courierId: entregadorId,
      method: DeliveryPayoutMethodEnum.Pix,
    });

    await repasse;

    // Crédito que chega depois do repasse abre um saldo novo, e não fica
    // pendurado no lote anterior.
    await prisma.financialTransaction.create({
      data: {
        type: 'Credit',
        category: 'DeliveryPayout',
        status: 'Paid',
        amount: new Prisma.Decimal('5.00'),
        availableAt: new Date(),
        referenceType: 'FoodOrder',
        referenceId: 999,
        userId: entregadorId,
      },
    });

    const [pendente] = await service.findPending();
    expect(pendente.amount).toBe('5.00');
    expect(pendente.deliveries).toBe(1);
  });
});
