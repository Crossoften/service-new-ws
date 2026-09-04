import {
  DeliveryFeeTypeEnum,
  PrismaClient,
  Role,
  Status,
  SubscriptionStatusEnum,
  UserProfileType,
} from '@prisma/client';
import { hashSync } from 'bcrypt';

/**
 * Monta o cenário completo de testes em um comando.
 *
 * Existe porque montar isso à mão custa uma dúzia de requisições e algumas
 * consultas SQL — e precisa ser refeito toda vez que o banco é recriado, o que
 * acontece com frequência enquanto integrações novas entram.
 *
 * Idempotente: pode rodar quantas vezes quiser. Diferente do `seed` principal,
 * que usa `createMany` e quebra na segunda execução por causa do e-mail único.
 *
 * NÃO cria nada que dependa de pagamento real. A assinatura do fornecedor é
 * concedida, do mesmo jeito que a rota de admin faz, e fica marcada como tal.
 */

const SENHA = '12345678';

// Centro de Uberlândia. O cliente fica a ~1,5 km, dentro da primeira faixa de
// frete — assim o cenário padrão exercita o cálculo por distância sem precisar
// de nenhum ajuste manual.
const COORD_RESTAURANTE = { latitude: -18.9186, longitude: -48.2772 };
const COORD_CLIENTE = { latitude: -18.9186, longitude: -48.263 };

interface ContaTeste {
  nome: string;
  email: string;
  telefone: string;
  perfil: UserProfileType;
}

const CONTAS: ContaTeste[] = [
  {
    nome: 'Teste Cliente',
    email: 'teste.cliente@email.com',
    telefone: '+5534900000001',
    perfil: UserProfileType.Client,
  },
  {
    nome: 'Teste Fornecedor',
    email: 'teste.fornecedor@email.com',
    telefone: '+5534900000002',
    perfil: UserProfileType.Supplier,
  },
  {
    nome: 'Teste Restaurante',
    email: 'teste.restaurante@email.com',
    telefone: '+5534900000003',
    perfil: UserProfileType.Supplier,
  },
  {
    nome: 'Teste Entregador',
    email: 'teste.entregador@email.com',
    telefone: '+5534900000004',
    perfil: UserProfileType.Delivery,
  },
];

export async function seedTestEnvironment(prisma: PrismaClient): Promise<void> {
  // A conta nasce Pending desde a verificação por SMS. Aqui elas nascem Active
  // de propósito: não há como receber o SMS de confirmação num seed.
  const senhaHash = hashSync(SENHA, 10);
  const usuarios: Record<string, number> = {};

  for (const conta of CONTAS) {
    const user = await prisma.user.upsert({
      where: { email: conta.email },
      update: {
        name: conta.nome,
        phone: conta.telefone,
        status: Status.Active,
        profileType: conta.perfil,
      },
      create: {
        name: conta.nome,
        email: conta.email,
        phone: conta.telefone,
        password: senhaHash,
        role: Role.User,
        profileType: conta.perfil,
        status: Status.Active,
      },
      select: { id: true },
    });

    usuarios[conta.email] = user.id;
  }

  await vincularEndereco(prisma, usuarios['teste.cliente@email.com'], {
    street: 'Rua do Cliente de Teste',
    number: '100',
    ...COORD_CLIENTE,
  });

  const admin = await prisma.user.findFirst({
    where: { role: { in: [Role.Master, Role.Admin] } },
    select: { id: true },
  });

  const plano = await prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, interval: true, intervalCount: true },
  });

  if (!plano) {
    throw new Error(
      'Nenhum plano ativo encontrado. Rode `npm run seed` antes, para criar planos e categorias.',
    );
  }

  for (const email of ['teste.fornecedor@email.com', 'teste.restaurante@email.com']) {
    await concederAssinatura(prisma, usuarios[email], plano, admin?.id ?? null);
  }

  await criarRestaurante(prisma, usuarios['teste.restaurante@email.com']);
  await criarFaixasDeFrete(prisma);

  imprimirResumo(usuarios);
}

async function vincularEndereco(
  prisma: PrismaClient,
  userId: number,
  dados: { street: string; number: string; latitude: number; longitude: number },
): Promise<number> {
  const existente = await prisma.user.findUnique({
    where: { id: userId },
    select: { addressId: true },
  });

  const payload = {
    street: dados.street,
    number: dados.number,
    neighborhood: 'Centro',
    city: 'Uberlândia',
    state: 'MG',
    zipCode: '38400-000',
    latitude: dados.latitude,
    longitude: dados.longitude,
  };

  if (existente?.addressId) {
    await prisma.address.update({ where: { id: existente.addressId }, data: payload });
    return existente.addressId;
  }

  const address = await prisma.address.create({ data: payload, select: { id: true } });
  await prisma.user.update({ where: { id: userId }, data: { addressId: address.id } });

  return address.id;
}

async function concederAssinatura(
  prisma: PrismaClient,
  userId: number,
  plano: { id: number; name: string; interval: any; intervalCount: number },
  adminId: number | null,
): Promise<void> {
  const ativa = await prisma.subscription.findFirst({
    where: {
      userId,
      status: SubscriptionStatusEnum.Active,
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: new Date() } }],
    },
    select: { id: true },
  });

  if (ativa) return;

  const agora = new Date();
  const fim = new Date(agora);
  fim.setFullYear(fim.getFullYear() + 5);

  await prisma.subscription.create({
    data: {
      userId,
      planId: plano.id,
      status: SubscriptionStatusEnum.Active,
      // Zerado porque nada foi cobrado — igual à concessão feita pela rota de
      // admin. Nenhum lançamento financeiro é criado.
      amount: 0,
      planName: plano.name,
      planInterval: plano.interval,
      intervalCount: plano.intervalCount,
      startedAt: agora,
      currentPeriodStart: agora,
      currentPeriodEnd: fim,
      grantedById: adminId,
      grantReason: 'Seed de ambiente de teste.',
    },
  });
}

async function criarRestaurante(prisma: PrismaClient, userId: number): Promise<void> {
  const categoria = await prisma.restaurantCategory.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });

  if (!categoria) {
    throw new Error(
      'Nenhuma categoria de restaurante encontrada. Rode `npm run seed` antes.',
    );
  }

  const existente = await prisma.restaurant.findUnique({
    where: { userId },
    select: { id: true, addressId: true },
  });

  let restaurantId: number;

  if (existente) {
    restaurantId = existente.id;

    if (existente.addressId) {
      await prisma.address.update({
        where: { id: existente.addressId },
        data: COORD_RESTAURANTE,
      });
    }
  } else {
    const endereco = await prisma.address.create({
      data: {
        street: 'Rua do Restaurante de Teste',
        number: '200',
        neighborhood: 'Centro',
        city: 'Uberlândia',
        state: 'MG',
        zipCode: '38400-010',
        ...COORD_RESTAURANTE,
      },
      select: { id: true },
    });

    const restaurante = await prisma.restaurant.create({
      data: {
        name: 'Cantina de Teste',
        description: 'Restaurante criado pelo seed de ambiente de teste.',
        isActive: true,
        isOpen: true,
        categoryId: categoria.id,
        userId,
        addressId: endereco.id,
      },
      select: { id: true },
    });

    restaurantId = restaurante.id;
  }

  // O cardápio só é criado quando não existe. Recriar apagaria itens que podem
  // estar referenciados por pedidos de teste anteriores.
  const temItens = await prisma.menuItem.findFirst({
    where: { restaurantId },
    select: { id: true },
  });

  if (temItens) return;

  const menuCategoria = await prisma.menuCategory.create({
    data: { name: 'Principais', sortOrder: 0, restaurantId },
    select: { id: true },
  });

  const xBurger = await prisma.menuItem.create({
    data: {
      name: 'X-Burger de Teste',
      description: 'Item principal do cenário de testes.',
      price: 25,
      isActive: true,
      restaurantId,
      menuCategoryId: menuCategoria.id,
    },
    select: { id: true },
  });

  await prisma.menuItemAddition.create({
    data: { name: 'Bacon extra', price: 5, isActive: true, menuItemId: xBurger.id },
  });

  await prisma.menuItem.create({
    data: {
      name: 'Refrigerante de Teste',
      price: 8,
      isActive: true,
      restaurantId,
      menuCategoryId: menuCategoria.id,
    },
  });
}

async function criarFaixasDeFrete(prisma: PrismaClient): Promise<void> {
  const existentes = await prisma.deliveryFeeRule.count();

  // Uma única faixa é o que a migration do C3 semeia, reproduzindo o
  // comportamento antigo de valor fixo. Substituímos por três faixas reais,
  // para o cálculo por distância ficar observável.
  if (existentes > 1) return;

  await prisma.deliveryFeeRule.deleteMany({});

  await prisma.deliveryFeeRule.createMany({
    data: [
      { minKm: 0, maxKm: 3, type: DeliveryFeeTypeEnum.Fixed, value: 6, isActive: true },
      { minKm: 3, maxKm: 10, type: DeliveryFeeTypeEnum.Fixed, value: 12, isActive: true },
      { minKm: 10, maxKm: null, type: DeliveryFeeTypeEnum.Percent, value: 20, isActive: true },
    ],
  });
}

function imprimirResumo(usuarios: Record<string, number>): void {
  console.log(`\nAmbiente de teste pronto. Todas as contas usam a senha ${SENHA}.\n`);

  for (const conta of CONTAS) {
    const id = String(usuarios[conta.email]).padEnd(4);
    console.log(`  ${conta.email.padEnd(30)} id ${id} ${conta.perfil}`);
  }

  console.log('\n  Fornecedor e restaurante já têm assinatura concedida, válida por 5 anos.');
  console.log('  Cliente e restaurante têm endereço com coordenadas, a ~1,5 km um do outro.');
  console.log('  Faixas de frete: 0-3 km R$ 6,00 | 3-10 km R$ 12,00 | 10 km+ 20% dos itens.\n');
}
