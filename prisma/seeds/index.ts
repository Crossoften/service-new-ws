import { PrismaClient } from '@prisma/client';
import { seedAdmin } from './admin.seeds';
import { seedServiceCategory } from './service-category.seeds';
import { seedRestaurantCategory } from './restaurant-category.seeds';
import { seedProductCategory } from './product-category.seeds';
import { seedAccommodationCategory } from './accommodation-category.seeds';
import { seedTransportationCategory } from './transportation-category.seeds';
import { seedUser } from './user.seeds';
import { seedText } from './text.seeds';
import { seedPlan } from './plan.seeds';

const prisma = new PrismaClient();

async function main() {
  await seedAdmin(prisma);
  await seedUser(prisma);
  await seedText(prisma);
  await seedServiceCategory(prisma);
  await seedRestaurantCategory(prisma);
  await seedProductCategory(prisma);
  await seedAccommodationCategory(prisma);
  await seedTransportationCategory(prisma);
  await seedPlan(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
