import { PrismaClient } from '@prisma/client';
import { categoryIconUrlFor } from '../../src/modules/category-icons/category-icon-file';

/**
 * Categorias de produto, usadas tanto na compra e venda quanto no aluguel — as
 * duas verticais apontam para o mesmo `Product`.
 *
 * São um ponto de partida deliberadamente genérico. Quem define a lista real é
 * o negócio; enquanto ela não vier, o importante é a tabela não estar vazia:
 * `GET /products/categories` filtra `isActive: true`, e com zero linhas o
 * fornecedor não consegue cadastrar produto nenhum.
 */
const productCategoryDefinitions = [
  { name: 'Eletrônicos', slug: 'eletronicos', sortOrder: 1 },
  { name: 'Eletrodomésticos', slug: 'eletrodomesticos', sortOrder: 2 },
  { name: 'Móveis e Decoração', slug: 'moveis-e-decoracao', sortOrder: 3 },
  { name: 'Ferramentas e Construção', slug: 'ferramentas-e-construcao', sortOrder: 4 },
  { name: 'Esporte e Lazer', slug: 'esporte-e-lazer', sortOrder: 5 },
  { name: 'Moda e Acessórios', slug: 'moda-e-acessorios', sortOrder: 6 },
  { name: 'Bebê e Infantil', slug: 'bebe-e-infantil', sortOrder: 7 },
  { name: 'Outros', slug: 'outros', sortOrder: 99 },
];

export async function seedProductCategory(prisma: PrismaClient) {
  for (const category of productCategoryDefinitions) {
    // Grava o ícone só quando o arquivo existe em `assets/category-icons`.
    const iconUrl = categoryIconUrlFor('products', category.slug);

    await prisma.productCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        ...(iconUrl ? { iconUrl } : {}),
      },
      // `isActive` fica de fora do update de propósito: se o admin desativou uma
      // categoria, rodar o seed de novo não pode reativá-la sozinho.
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        ...(iconUrl ? { iconUrl } : {}),
      },
    });
  }
}
