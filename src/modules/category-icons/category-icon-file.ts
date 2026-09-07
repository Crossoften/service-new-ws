import { existsSync, readdirSync } from 'fs';
import { basename, extname, join, resolve } from 'path';

/**
 * Verticais que têm categoria com ícone. O nome aqui é o segmento da URL e o do
 * diretório em disco — manter os dois iguais evita uma tabela de conversão.
 */
export const CATEGORY_ICON_VERTICALS = [
  'services',
  'restaurants',
  'products',
  'accommodations',
  'transportations',
] as const;

export type CategoryIconVertical = (typeof CATEGORY_ICON_VERTICALS)[number];

const EXTENSOES_ACEITAS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

/**
 * Diretório raiz dos ícones, resolvido a partir da raiz do projeto.
 *
 * Fica fora de `src` de propósito: `nest build` não copia arquivo estático para
 * `dist`, então ler do `cwd` é o que faz o mesmo caminho valer em
 * desenvolvimento e em produção.
 */
export function categoryIconsDir(): string {
  return resolve(process.env.CATEGORY_ICONS_DIR || 'assets/category-icons');
}

/**
 * Nome do arquivo de ícone da categoria, quando ele existe em disco.
 *
 * Procura por extensão, na ordem de preferência. Devolver `null` quando não há
 * arquivo é o ponto central do desenho: o seed só grava `iconUrl` para
 * categoria que tem imagem de verdade, em vez de apontar todas para 404.
 */
export function findCategoryIconFile(vertical: CategoryIconVertical, slug: string): string | null {
  const diretorio = join(categoryIconsDir(), vertical);

  if (!existsSync(diretorio)) return null;

  const arquivos = readdirSync(diretorio);

  for (const extensao of EXTENSOES_ACEITAS) {
    const alvo = `${slug}${extensao}`;

    if (arquivos.includes(alvo)) return alvo;
  }

  return null;
}

/**
 * Caminho absoluto de um ícone, ou `null` se ele não existir ou escapar do
 * diretório — o nome vem da URL e não pode virar travessia de caminho.
 */
export function resolveCategoryIconPath(vertical: string, fileName: string): string | null {
  if (!CATEGORY_ICON_VERTICALS.includes(vertical as CategoryIconVertical)) return null;

  const seguro = basename(fileName);

  if (!EXTENSOES_ACEITAS.includes(extname(seguro).toLowerCase())) return null;

  const diretorio = join(categoryIconsDir(), vertical);
  const caminho = resolve(join(diretorio, seguro));

  if (!caminho.startsWith(resolve(diretorio)) || !existsSync(caminho)) return null;

  return caminho;
}

/**
 * URL pública do ícone.
 *
 * `SERVICE_CATEGORY_PUBLIC_URL_BASE` continua tendo precedência: quem já
 * hospeda os ícones num bucket ou CDN não deve passar a servi-los pela API só
 * porque este mecanismo apareceu.
 */
export function buildCategoryIconUrl(vertical: CategoryIconVertical, fileName: string): string {
  const baseExterna = process.env.SERVICE_CATEGORY_PUBLIC_URL_BASE;

  if (baseExterna) {
    return `${baseExterna.replace(/\/+$/, '')}/${vertical}/${fileName}`;
  }

  const baseApi = (
    process.env.URL_INTEGRATION || `http://localhost:${process.env.PORT || 8000}`
  ).replace(/\/+$/, '');

  return `${baseApi}/v1/category-icons/${vertical}/${fileName}`;
}

/**
 * Atalho para os seeds: a URL da categoria, ou `null` quando não há arquivo.
 */
export function categoryIconUrlFor(vertical: CategoryIconVertical, slug: string): string | null {
  const arquivo = findCategoryIconFile(vertical, slug);

  return arquivo ? buildCategoryIconUrl(vertical, arquivo) : null;
}
