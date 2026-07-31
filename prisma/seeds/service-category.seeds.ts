import { PrismaClient } from '@prisma/client';
import {
  buildServiceCategoryPublicIconUrl,
  serviceCategoryDefinitions,
} from '../../src/modules/mobile/service-category.constants';

export async function seedServiceCategory(prisma: PrismaClient) {
  const publicBaseUrl = process.env.SERVICE_CATEGORY_PUBLIC_URL_BASE;

  for (const category of serviceCategoryDefinitions) {
    const iconUrl = buildServiceCategoryPublicIconUrl(category.localIcon, publicBaseUrl);

    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        iconUrl,
      },
      update: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        iconUrl,
      },
    });
  }
}
