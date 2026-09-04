import { PrismaClient } from '@prisma/client';
import { seedTestEnvironment } from './test-environment.seeds';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Este seed cria contas com senha conhecida e assinaturas concedidas sem
  // cobrança. Em produção isso é porta dos fundos, não conveniência.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'O seed de ambiente de teste não roda com NODE_ENV=production. ' +
        'Ele cria contas com senha padrão e assinaturas sem cobrança.',
    );
  }

  await seedTestEnvironment(prisma);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
