import { PrismaClient } from '@prisma/client';
import { categoryIconUrlFor } from '../../src/modules/category-icons/category-icon-file';

/**
 * Categorias de transporte. Mesmo raciocínio dos outros dois: sem linha ativa,
 * `GET /transportations/categories` volta vazio e o cadastro de transporte fica
 * impossível pelo app.
 */
const transportationCategoryDefinitions = [
  { name: 'Frete e Mudança', slug: 'frete-e-mudanca', sortOrder: 1 },
  { name: 'Motoboy e Entregas', slug: 'motoboy-e-entregas', sortOrder: 2 },
  { name: 'Transporte de Passageiros', slug: 'transporte-de-passageiros', sortOrder: 3 },
  { name: 'Van e Fretamento', slug: 'van-e-fretamento', sortOrder: 4 },
  { name: 'Guincho e Reboque', slug: 'guincho-e-reboque', sortOrder: 5 },
  { name: 'Outros', slug: 'outros-transporte', sortOrder: 99 },
];

export async function seedTransportationCategory(prisma: PrismaClient) {
  for (const category of transportationCategoryDefinitions) {
    // Grava o ícone só quando o arquivo existe em `assets/category-icons`.
    const iconUrl = categoryIconUrlFor('transportations', category.slug);

    await prisma.transportationCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        ...(iconUrl ? { iconUrl } : {}),
      },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        ...(iconUrl ? { iconUrl } : {}),
      },
    });
  }
}
