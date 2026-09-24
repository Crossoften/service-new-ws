import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Limpa as tabelas que os testes tocam, na ordem que respeita as chaves
 * estrangeiras.
 *
 * `TRUNCATE` seria mais rápido, mas esbarra nas FKs; `deleteMany` na ordem
 * certa é previsível e não exige desligar a checagem de integridade — que é
 * justamente o que estes testes querem exercitar.
 */
export async function limparBanco(): Promise<void> {
  await prisma.financialTransaction.deleteMany();
  await prisma.deliveryPayout.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.deliveryAssignment.deleteMany();
  await prisma.foodOrderItemAddition.deleteMany();
  await prisma.foodOrderItem.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.foodOrder.deleteMany();
  await prisma.workFile.deleteMany();
  await prisma.work.deleteMany();
  await prisma.budgetFile.deleteMany();
  await prisma.budgetInformation.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.service.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.restaurantCategory.deleteMany();
  await prisma.user.deleteMany();
}

let sequencia = 0;

/** Usuário mínimo, com telefone único para não esbarrar no índice. */
export async function criarUsuario(nome: string) {
  sequencia += 1;

  return prisma.user.create({
    data: {
      name: nome,
      phone: `+5534900${String(sequencia).padStart(6, '0')}`,
      password: 'hash-de-teste',
      status: 'Active',
    },
    select: { id: true, name: true },
  });
}

/**
 * Restaurante mínimo, com o dono já criado.
 *
 * Existe porque `FoodOrder` exige restaurante, e restaurante exige categoria e
 * dono. Montar isso em cada teste esconderia o que está sendo testado.
 */
export async function criarRestaurante() {
  sequencia += 1;
  const dono = await criarUsuario('Dono do restaurante');

  const categoria = await prisma.restaurantCategory.create({
    data: { name: `Categoria ${sequencia}`, slug: `categoria-${sequencia}` },
    select: { id: true },
  });

  const restaurante = await prisma.restaurant.create({
    data: { name: `Restaurante ${sequencia}`, categoryId: categoria.id, userId: dono.id },
    select: { id: true, userId: true },
  });

  return restaurante;
}

/** Serviço mínimo, com categoria e prestador. */
export async function criarServico(providerId: number) {
  sequencia += 1;

  const categoria = await prisma.serviceCategory.create({
    data: { name: `Serviço cat ${sequencia}`, slug: `servico-cat-${sequencia}` },
    select: { id: true },
  });

  return prisma.service.create({
    data: {
      name: `Serviço ${sequencia}`,
      type: 'Presential',
      categoryId: categoria.id,
      userId: providerId,
    },
    select: { id: true },
  });
}

/** Categoria de atuação avulsa, para os testes de assinatura por categoria. */
export async function criarCategoriaDeServico(nome: string) {
  sequencia += 1;

  return prisma.serviceCategory.create({
    data: { name: `${nome} ${sequencia}`, slug: `${nome.toLowerCase()}-${sequencia}` },
    select: { id: true, name: true },
  });
}

/** Plano avulso, com o preço e o ciclo informados. */
export async function criarPlano(nome: string, preco: string, meses: number) {
  sequencia += 1;

  return prisma.plan.create({
    data: {
      name: nome,
      slug: `${nome.toLowerCase().replace(/\s+/g, '-')}-${sequencia}`,
      price: preco,
      interval: 'Month',
      intervalCount: meses,
    },
    select: { id: true, name: true },
  });
}

/**
 * Assinatura ativa de uma categoria, já dentro do período.
 *
 * `categoryId` nulo é a concessão administrativa, que cobre todas as
 * categorias — é o caso que o gate precisa aceitar sem filtro.
 */
export async function criarAssinaturaAtiva(opcoes: {
  userId: number;
  planId: number;
  categoryId: number | null;
  terminaEm: Date;
  cancelAtPeriodEnd?: boolean;
}) {
  return prisma.subscription.create({
    data: {
      userId: opcoes.userId,
      planId: opcoes.planId,
      categoryId: opcoes.categoryId,
      cancelAtPeriodEnd: opcoes.cancelAtPeriodEnd ?? false,
      status: 'Active',
      amount: '19.90',
      planName: 'Plano de teste',
      planInterval: 'Month',
      intervalCount: 1,
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: opcoes.terminaEm,
    },
    select: { id: true },
  });
}
