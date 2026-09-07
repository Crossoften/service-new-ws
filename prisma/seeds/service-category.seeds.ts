import { PrismaClient } from '@prisma/client';
import { serviceCategoryDefinitions } from '../../src/modules/mobile/service-category.constants';
import { categoryIconUrlFor } from '../../src/modules/category-icons/category-icon-file';

export async function seedServiceCategory(prisma: PrismaClient) {
  for (const category of serviceCategoryDefinitions) {
    // Só grava a URL quando o arquivo existe. Antes, a URL era montada às cegas
    // a partir de SERVICE_CATEGORY_PUBLIC_URL_BASE: vazia, nenhuma categoria
    // tinha ícone; preenchida, todas apontavam para lá — inclusive as oito que
    // não têm imagem no repositório, que viravam 404 na vitrine.
    const iconUrl = categoryIconUrlFor('services', category.slug);

    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        ...(iconUrl ? { iconUrl } : {}),
      },
      // `iconUrl` fora do update quando não há arquivo: rodar o seed sem os
      // ícones em disco não pode apagar o que já estava gravado.
      update: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        ...(iconUrl ? { iconUrl } : {}),
      },
    });
  }
}
