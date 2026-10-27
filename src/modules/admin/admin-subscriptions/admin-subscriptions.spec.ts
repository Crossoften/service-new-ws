import { PrismaService } from '@database/PrismaService';
import { Prisma, SubscriptionStatusEnum, UserProfileType } from '@prisma/client';

import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { SubscriptionOriginFilter } from './dto/query-admin-subscription.dto';

const PASSADO = new Date('2020-01-01T00:00:00Z');
const FUTURO = new Date('2099-01-01T00:00:00Z');

function linha(parcial: Record<string, unknown> = {}) {
  return {
    id: 12,
    planName: 'Plano Mensal',
    planInterval: 'Month',
    amount: new Prisma.Decimal('0'),
    status: SubscriptionStatusEnum.Active,
    categoryId: null,
    category: null,
    grantedById: 1,
    grantReason: 'Conta de testes',
    bonusMonths: 0,
    cancelAtPeriodEnd: false,
    currentPeriodStart: PASSADO,
    currentPeriodEnd: FUTURO,
    createdAt: PASSADO,
    user: { id: 7, name: 'Marina Souza', email: 'marina@email.com', phone: '+5534998701109' },
    grantedBy: { id: 1, name: 'Admin', email: 'admin@email.com', phone: null },
    ...parcial,
  };
}

function build(linhas: ReturnType<typeof linha>[] = [linha()], total = 1) {
  const buscar = jest.fn().mockResolvedValue(linhas);
  const contar = jest.fn().mockResolvedValue(total);

  const prisma = {
    subscription: { findMany: buscar, count: contar },
  } as unknown as PrismaService;

  return { service: new AdminSubscriptionsService(prisma), buscar, contar };
}

describe('AdminSubscriptionsService.findAll — filtros', () => {
  // A assinatura é o que libera quem oferece serviço. Outros perfis na lista
  // mostrariam linha que não se concede.
  it('restringe a fornecedores', async () => {
    const { service, buscar } = build();

    await service.findAll({});

    expect(buscar.mock.calls[0][0].where.user.profileType).toBe(UserProfileType.Supplier);
  });

  it('busca por nome ou email do fornecedor', async () => {
    const { service, buscar } = build();

    await service.findAll({ search: '  Marina  ' });

    expect(buscar.mock.calls[0][0].where.user.OR).toEqual([
      { name: { contains: 'Marina' } },
      { email: { contains: 'Marina' } },
    ]);
  });

  it('não manda busca quando o termo vem vazio', async () => {
    const { service, buscar } = build();

    await service.findAll({ search: '   ' });

    expect(buscar.mock.calls[0][0].where.user.OR).toBeUndefined();
  });

  /**
   * `grantedById` é o único sinal que separa concessão de assinatura paga — só
   * a rota de concessão preenche o campo.
   */
  it('filtra as concedidas por grantedById preenchido', async () => {
    const { service, buscar } = build();

    await service.findAll({ origin: SubscriptionOriginFilter.Granted });

    expect(buscar.mock.calls[0][0].where.grantedById).toEqual({ not: null });
  });

  it('filtra as pagas por grantedById nulo', async () => {
    const { service, buscar } = build();

    await service.findAll({ origin: SubscriptionOriginFilter.Paid });

    expect(buscar.mock.calls[0][0].where.grantedById).toBeNull();
  });

  it('não filtra por origem quando nada é pedido', async () => {
    const { service, buscar } = build();

    await service.findAll({});

    expect('grantedById' in buscar.mock.calls[0][0].where).toBe(false);
  });

  it('filtra por status e por fornecedor', async () => {
    const { service, buscar } = build();

    await service.findAll({ status: SubscriptionStatusEnum.Cancelled, providerId: 7 });

    expect(buscar.mock.calls[0][0].where.status).toBe(SubscriptionStatusEnum.Cancelled);
    expect(buscar.mock.calls[0][0].where.userId).toBe(7);
  });

  it('usa o mesmo where na contagem e na busca', async () => {
    const { service, buscar, contar } = build();

    await service.findAll({ search: 'Marina' });

    expect(contar.mock.calls[0][0].where).toEqual(buscar.mock.calls[0][0].where);
  });
});

describe('AdminSubscriptionsService.findAll — paginação', () => {
  it('usa dez por página e primeira página por padrão', async () => {
    const { service, buscar } = build();

    await service.findAll({});

    expect(buscar.mock.calls[0][0].take).toBe(10);
    expect(buscar.mock.calls[0][0].skip).toBe(0);
  });

  // `skip` é número de página nesta API, não deslocamento — convenção dos
  // outros módulos de admin.
  it('trata skip como número de página', async () => {
    const { service, buscar } = build();

    await service.findAll({ take: 5, skip: 3 });

    expect(buscar.mock.calls[0][0].skip).toBe(10);
  });

  it('calcula o total de páginas', async () => {
    const { service } = build([linha()], 25);

    const resposta = await service.findAll({ take: 10 });

    expect(resposta.totalPages).toBe(3);
    expect(resposta.totalRecords).toBe(25);
  });

  it('mantém uma página quando não há registro', async () => {
    const { service } = build([], 0);

    const resposta = await service.findAll({});

    expect(resposta.totalPages).toBe(1);
    expect(resposta.subscriptions).toEqual([]);
  });

  it('traz a mais recente primeiro', async () => {
    const { service, buscar } = build();

    await service.findAll({});

    expect(buscar.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('AdminSubscriptionsService.findAll — formato', () => {
  it('achata fornecedor, quem concedeu e categoria', async () => {
    const { service } = build([linha({ categoryId: 4, category: { name: 'Pintura' } })]);

    const [item] = (await service.findAll({})).subscriptions;

    expect(item.provider).toEqual({
      id: 7,
      name: 'Marina Souza',
      email: 'marina@email.com',
      phone: '+5534998701109',
    });
    expect(item.grantedBy?.name).toBe('Admin');
    expect(item.grantedBy?.phone).toBeUndefined();
    expect(item.categoryId).toBe(4);
    expect(item.categoryName).toBe('Pintura');
  });

  it('converte o Decimal do valor em número', async () => {
    const { service } = build([linha({ amount: new Prisma.Decimal('49.90') })]);

    const [item] = (await service.findAll({})).subscriptions;

    expect(item.amount).toBe(49.9);
    expect(typeof item.amount).toBe('number');
  });

  it('marca como concedida quem tem grantedById', async () => {
    const { service } = build([linha()]);

    const [item] = (await service.findAll({})).subscriptions;

    expect(item.isGranted).toBe(true);
    expect(item.grantReason).toBe('Conta de testes');
  });

  /**
   * O motivo é **opcional** na concessão (`reason?` no `GrantSubscriptionDto`,
   * gravado como `null` quando vem vazio). Então uma concessão sem motivo tem
   * `grantedById` preenchido e `grantReason` nulo — e precisa continuar sendo
   * concessão. Derivar a origem do motivo rotularia essa linha como paga, o
   * que é justamente o que o painel não pode errar.
   */
  it('marca como concedida mesmo sem motivo informado', async () => {
    const { service } = build([linha({ grantReason: null })]);

    const [item] = (await service.findAll({})).subscriptions;

    expect(item.isGranted).toBe(true);
    expect(item.grantReason).toBeUndefined();
    expect(item.grantedBy?.id).toBe(1);
  });

  it('marca como paga quem não tem grantedById', async () => {
    const { service } = build([linha({ grantedById: null, grantedBy: null, grantReason: null })]);

    const [item] = (await service.findAll({})).subscriptions;

    expect(item.isGranted).toBe(false);
    expect(item.grantedBy).toBeUndefined();
    expect(item.grantReason).toBeUndefined();
  });

  it('calcula isCurrent pela vigência, não só pelo status', async () => {
    const { service } = build([
      linha({ id: 1, currentPeriodEnd: FUTURO }),
      linha({ id: 2, currentPeriodEnd: PASSADO }),
      linha({ id: 3, currentPeriodEnd: null }),
      linha({ id: 4, status: SubscriptionStatusEnum.Cancelled, currentPeriodEnd: FUTURO }),
    ]);

    const itens = (await service.findAll({})).subscriptions;

    expect(itens.map((i) => i.isCurrent)).toEqual([true, false, true, false]);
  });

  it('omite cobertura de categoria na concessão, que é ampla', async () => {
    const { service } = build([linha({ categoryId: null, category: null })]);

    const [item] = (await service.findAll({})).subscriptions;

    expect(item.categoryId).toBeUndefined();
    expect(item.categoryName).toBeUndefined();
  });
});
