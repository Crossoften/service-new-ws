import { PrismaClient, Role, Status, UserProfileType } from '@prisma/client';
import { hashSync } from 'bcrypt';

export async function seedUser(prisma: PrismaClient) {
  // `skipDuplicates` porque o e-mail é único: sem ele, rodar o seed numa base
  // que já tem as contas de exemplo estoura P2002 e derruba o restante.
  await prisma.user.createMany({
    skipDuplicates: true,
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
        name: 'delivery one',
        email: 'delivery.one@email.com',
        password: hashSync('12345678', 10),
        role: Role.User,
        profileType: UserProfileType.Delivery,
        status: Status.Active,
      },
      {
        name: 'supplier one',
        email: 'supplier.one@email.com',
        password: hashSync('12345678', 10),
        role: Role.User,
        profileType: UserProfileType.Supplier,
        status: Status.Active,
      },
      {
        name: 'influencer one',
        email: 'influencer.one@email.com',
        password: hashSync('12345678', 10),
        role: Role.User,
        profileType: UserProfileType.Influencer,
        status: Status.Active,
        // Sem isto a conta de exemplo nasce sem código e a tela "Meu link" do
        // app fica vazia — foi exatamente o que a integração encontrou. Valor
        // fixo, e não gerado, para servir como código de convite conhecido nos
        // testes manuais.
        referralCode: 'influencer-one',
      },
    ],
  });
}
