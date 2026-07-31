import { AdminPermissions, PrismaClient, Role, Status } from '@prisma/client';
import { hashSync } from 'bcrypt';

export async function seedAdmin(prisma: PrismaClient) {
  const permissions = Object.values(AdminPermissions);

  const newMaster = await prisma.user.create({
    data: {
      name: 'master',
      email: 'admin.master@email.com',
      password: hashSync('12345678', 10),
      role: Role.Master,
      status: Status.Active,
    },
  });

  for (const permission of permissions) {
    await prisma.adminPermission.create({
      data: {
        name: permission,
        admin: { connect: { id: newMaster.id } },
      },
    });
  }

  await prisma.user.create({
    data: {
      name: 'admin',
      email: 'admin.one@email.com',
      password: hashSync('12345678', 10),
      role: Role.Admin,
      status: Status.Active,
      adminPermissions: {
        connect: permissions.map((name) => ({ name })),
      },
    },
  });
}
