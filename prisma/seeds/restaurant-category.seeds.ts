import { PrismaClient } from '@prisma/client';
import { categoryIconUrlFor } from '../../src/modules/category-icons/category-icon-file';

const restaurantCategoryDefinitions = [
  { name: 'Lanches', slug: 'lanches', sortOrder: 0 },
  { name: 'Pizzas', slug: 'pizzas', sortOrder: 1 },
  { name: 'Comida Brasileira', slug: 'comida-brasileira', sortOrder: 2 },
  { name: 'Japonesa', slug: 'japonesa', sortOrder: 3 },
  { name: 'Doces e Sobremesas', slug: 'doces-e-sobremesas', sortOrder: 4 },
];

export async function seedRestaurantCategory(prisma: PrismaClient) {
  for (const category of restaurantCategoryDefinitions) {
    // Grava o ícone só quando o arquivo existe em `assets/category-icons`.
    const iconUrl = categoryIconUrlFor('restaurants', category.slug);

    await prisma.restaurantCategory.upsert({
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
