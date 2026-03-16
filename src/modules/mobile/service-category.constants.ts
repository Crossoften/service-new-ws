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

export function buildServiceCategoryPublicIconUrl(
  localIcon: string,
  publicBaseUrl?: string,
): string | null {
  if (!publicBaseUrl) return null;

  const normalizedBaseUrl = publicBaseUrl.replace(/\/+$/, '');
  const normalizedIconPath = localIcon.replace(/^\/+/, '');

  return `${normalizedBaseUrl}/${normalizedIconPath}`;
}
