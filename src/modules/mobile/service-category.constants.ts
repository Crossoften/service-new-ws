import { existsSync } from 'fs';
import { basename, resolve } from 'path';

export const serviceCategoryDefinitions = [
  { name: 'Pintor', slug: 'pintor', sortOrder: 1, localIcon: 'service-categories/pintor.png' },
  {
    name: 'Pedreiro',
    slug: 'pedreiro',
    sortOrder: 2,
    localIcon: 'service-categories/pedreiro.png',
  },
  {
    name: 'Advogado',
    slug: 'advogado',
    sortOrder: 3,
    localIcon: 'service-categories/advogado.png',
  },
  {
    name: 'Dentista',
    slug: 'dentista',
    sortOrder: 4,
    localIcon: 'service-categories/dentista.png',
  },
  { name: 'Médico', slug: 'medico', sortOrder: 5, localIcon: 'service-categories/medico.png' },
  {
    name: 'Manicure',
    slug: 'manicure',
    sortOrder: 6,
    localIcon: 'service-categories/manicure.png',
  },
  {
    name: 'Jardineiro',
    slug: 'jardineiro',
    sortOrder: 7,
    localIcon: 'service-categories/jardineiro.png',
  },
  {
    name: 'Cabeleireiro',
    slug: 'cabeleireiro',
    sortOrder: 8,
    localIcon: 'service-categories/cabeleireiro.png',
  },
  {
    name: 'Faxineira',
    slug: 'faxineira',
    sortOrder: 9,
    localIcon: 'service-categories/faxineira.png',
  },
] as const;

export type ServiceCategorySlug = (typeof serviceCategoryDefinitions)[number]['slug'];

export const serviceCategoryIconMap: Record<ServiceCategorySlug, string> =
  serviceCategoryDefinitions.reduce(
    (acc, category) => {
      acc[category.slug] = category.localIcon;
      return acc;
    },
    {} as Record<ServiceCategorySlug, string>,
  );

/**
 * Onde os arquivos de ícone de categoria de serviço ficam no repositório.
 *
 * O primeiro é o local atual. Os outros dois são herdados e continuam na lista
 * porque o projeto ainda tem os diretórios: `assets/service-categories` casa
 * com o caminho declarado em `localIcon`, e `images/services-categories` era
 * onde a imagem morava antes de ser movida.
 */
const SERVICE_CATEGORY_ICON_DIRS = [
  'assets/category-icons/services',
  'prisma/seeds/assets/service-categories',
  'prisma/seeds/images/services-categories',
];

/**
 * Confirma que a imagem existe no repositório antes de alguém montar a URL.
 *
 * Sem esta checagem, o seed montava a URL para TODAS as categorias a partir de
 * `SERVICE_CATEGORY_PUBLIC_URL_BASE`. Com a variável vazia — o padrão — ninguém
 * ficava com ícone e o problema não aparecia. Preenchida, as nove categorias
 * ganhavam URL e oito apontavam para arquivo que não existe: a vitrine passaria
 * a exibir imagem quebrada onde hoje exibe o fallback do app.
 */
export function serviceCategoryIconExists(localIcon: string): boolean {
  const arquivo = basename(localIcon);

  return SERVICE_CATEGORY_ICON_DIRS.some((diretorio) => existsSync(resolve(diretorio, arquivo)));
}

export function buildServiceCategoryPublicIconUrl(
  localIcon: string,
  publicBaseUrl?: string,
): string | null {
  if (!publicBaseUrl) return null;

  const normalizedBaseUrl = publicBaseUrl.replace(/\/+$/, '');
  const normalizedIconPath = localIcon.replace(/^\/+/, '');

  return `${normalizedBaseUrl}/${normalizedIconPath}`;
}
