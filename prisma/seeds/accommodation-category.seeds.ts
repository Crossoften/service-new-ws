import { PrismaClient } from '@prisma/client';

/**
 * Categorias de hospedagem. Mesmo raciocínio do seed de produto: sem linha
 * ativa, `GET /accommodations/categories` volta vazio e o cadastro de
 * hospedagem fica impossível pelo app.
 */
const accommodationCategoryDefinitions = [
  { name: 'Casa', slug: 'casa', sortOrder: 1 },
  { name: 'Apartamento', slug: 'apartamento', sortOrder: 2 },
  { name: 'Chácara e Sítio', slug: 'chacara-e-sitio', sortOrder: 3 },
  { name: 'Pousada', slug: 'pousada', sortOrder: 4 },
  { name: 'Hotel', slug: 'hotel', sortOrder: 5 },
  { name: 'Quarto', slug: 'quarto', sortOrder: 6 },
  { name: 'Outros', slug: 'outros-hospedagem', sortOrder: 99 },
];

export async function seedAccommodationCategory(prisma: PrismaClient) {
  for (const category of accommodationCategoryDefinitions) {
    await prisma.accommodationCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
      },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
      },
    });
  }
}
