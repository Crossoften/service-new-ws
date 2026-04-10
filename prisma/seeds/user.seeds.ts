import { PrismaClient, Role, Status, UserProfileType } from '@prisma/client';
import { hashSync } from 'bcrypt';

export async function seedUser(prisma: PrismaClient) {
  await prisma.user.createMany({
    data: [
      {
        name: 'client one',
        email: 'client.one@email.com',
        password: hashSync('12345678', 10),
        role: Role.User,
        profileType: UserProfileType.Client,
        status: Status.Active,
      },
      {
        name: 'partner one',
        email: 'partner.one@email.com',
        password: hashSync('12345678', 10),
        role: Role.User,
        profileType: UserProfileType.Partner,
        status: Status.Active,
      },
      {
        name: 'delivery one',
        email: 'delivery.one@email.com',
        password: hashSync('12345678', 10),
        role: Role.User,
        profileType: UserProfileType.Delivery,
        status: Status.Active,
      },
    ],
  });

  console.log('Users seed added successfully 🌱.');
}
