import { PrismaClient } from '@prisma/client';
import {
  buildServiceCategoryPublicIconUrl,
  serviceCategoryDefinitions,
  serviceCategoryIconExists,
} from '../../src/modules/mobile/service-category.constants';

export async function seedServiceCategory(prisma: PrismaClient) {
  const publicBaseUrl = process.env.SERVICE_CATEGORY_PUBLIC_URL_BASE;

  for (const category of serviceCategoryDefinitions) {
    // Só monta a URL para categoria cuja imagem existe de fato. Ver
    // `serviceCategoryIconExists` para o porquê.
    const iconUrl = serviceCategoryIconExists(category.localIcon)
      ? buildServiceCategoryPublicIconUrl(category.localIcon, publicBaseUrl)
      : null;

    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        ...(iconUrl ? { iconUrl } : {}),
      },
      // `iconUrl` fica fora do update quando não há URL a gravar: rodar o seed
      // sem a variável configurada não pode apagar o ícone que o admin já tenha
      // definido pelo painel.
      update: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        ...(iconUrl ? { iconUrl } : {}),
      },
    });
  }
}
