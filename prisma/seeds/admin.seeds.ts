import { AdminPermissions, PrismaClient, Role, Status } from '@prisma/client';
import { hashSync } from 'bcrypt';

/**
 * Contas administrativas iniciais.
 *
 * Idempotente por e-mail. Antes usava `create` direto e, numa base que já
 * tivesse os admins, estourava `P2002` na primeira linha — derrubando o seed
 * inteiro antes de chegar nas categorias, planos e textos. Na prática, isso
 * tornava `npm run seed` executável uma única vez na vida de cada banco.
 *
 * A senha só é gravada na criação: rodar o seed de novo não deve sobrescrever
 * uma senha que alguém já trocou.
 */
export async function seedAdmin(prisma: PrismaClient) {
  const permissions = Object.values(AdminPermissions);

  const master = await prisma.user.upsert({
    where: { email: 'admin.master@email.com' },
    create: {
      name: 'master',
      email: 'admin.master@email.com',
      password: hashSync('12345678', 10),
      role: Role.Master,
      status: Status.Active,
    },
    update: { role: Role.Master, status: Status.Active },
    select: { id: true },
  });

  for (const permission of permissions) {
    await prisma.adminPermission.upsert({
      where: { name: permission },
      create: { name: permission, admin: { connect: { id: master.id } } },
      update: {},
    });
  }

  await prisma.user.upsert({
    where: { email: 'admin.one@email.com' },
    create: {
      name: 'admin',
      email: 'admin.one@email.com',
      password: hashSync('12345678', 10),
      role: Role.Admin,
      status: Status.Active,
      adminPermissions: { connect: permissions.map((name) => ({ name })) },
    },
    // As permissões são reconectadas para cobrir enum novo adicionado depois
    // que a conta já existia.
    update: {
      role: Role.Admin,
      status: Status.Active,
      adminPermissions: { connect: permissions.map((name) => ({ name })) },
    },
  });
}
