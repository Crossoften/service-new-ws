import { Prisma, PrismaClient } from '@prisma/client';
import { planDefinitions } from '../../src/modules/plans/plans/constants/plan.constants';

export async function seedPlan(prisma: PrismaClient) {
  for (const plan of planDefinitions) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      create: {
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: new Prisma.Decimal(plan.price),
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        bonusMonths: plan.bonusMonths,
        isActive: true,
        sortOrder: plan.sortOrder,
      },
      update: {
        name: plan.name,
        description: plan.description,
        price: new Prisma.Decimal(plan.price),
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        bonusMonths: plan.bonusMonths,
        isActive: true,
        sortOrder: plan.sortOrder,
      },
    });
  }
}
