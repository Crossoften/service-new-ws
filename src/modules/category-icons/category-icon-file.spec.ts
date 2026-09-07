import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  buildCategoryIconUrl,
  categoryIconUrlFor,
  findCategoryIconFile,
  resolveCategoryIconPath,
} from './category-icon-file';

const RAIZ = join(tmpdir(), `icones-${process.pid}`);

beforeAll(() => {
  mkdirSync(join(RAIZ, 'services'), { recursive: true });
  mkdirSync(join(RAIZ, 'products'), { recursive: true });
  writeFileSync(join(RAIZ, 'services', 'pintor.png'), 'png');
  writeFileSync(join(RAIZ, 'products', 'eletronicos.webp'), 'webp');
  writeFileSync(join(RAIZ, 'services', 'malicioso.exe'), 'nao');
  process.env.CATEGORY_ICONS_DIR = RAIZ;
});

afterAll(() => {
  rmSync(RAIZ, { recursive: true, force: true });
  delete process.env.CATEGORY_ICONS_DIR;
  delete process.env.SERVICE_CATEGORY_PUBLIC_URL_BASE;
});

describe('findCategoryIconFile', () => {
  it('encontra o ícone pelo slug', () => {
    expect(findCategoryIconFile('services', 'pintor')).toBe('pintor.png');
  });

  it('aceita outras extensões da lista', () => {
    expect(findCategoryIconFile('products', 'eletronicos')).toBe('eletronicos.webp');
  });

  it('devolve null quando não há arquivo — é o que evita gravar URL para 404', () => {
    expect(findCategoryIconFile('services', 'dentista')).toBeNull();
  });

  it('devolve null para vertical sem diretório', () => {
    expect(findCategoryIconFile('accommodations', 'casa')).toBeNull();
  });
});

describe('resolveCategoryIconPath', () => {
  it('resolve o caminho de um ícone existente', () => {
    expect(resolveCategoryIconPath('services', 'pintor.png')).toContain('services');
  });

  it('recusa travessia de caminho', () => {
    expect(resolveCategoryIconPath('services', '../../../etc/passwd')).toBeNull();
  });

  it('recusa vertical desconhecida', () => {
    expect(resolveCategoryIconPath('hackers', 'pintor.png')).toBeNull();
  });

  it('recusa extensão fora da lista, mesmo com o arquivo existindo', () => {
    expect(resolveCategoryIconPath('services', 'malicioso.exe')).toBeNull();
  });
});

describe('buildCategoryIconUrl', () => {
  it('aponta para a própria API quando não há base externa', () => {
    delete process.env.SERVICE_CATEGORY_PUBLIC_URL_BASE;
    process.env.URL_INTEGRATION = 'https://api.exemplo.com';

    expect(buildCategoryIconUrl('services', 'pintor.png')).toBe(
      'https://api.exemplo.com/v1/category-icons/services/pintor.png',
    );
  });

  it('respeita a base externa: quem já hospeda em CDN não passa a servir pela API', () => {
    process.env.SERVICE_CATEGORY_PUBLIC_URL_BASE = 'https://cdn.exemplo.com/icones/';

    expect(buildCategoryIconUrl('services', 'pintor.png')).toBe(
      'https://cdn.exemplo.com/icones/services/pintor.png',
    );
  });
});

describe('categoryIconUrlFor', () => {
  it('devolve null quando a categoria não tem arquivo', () => {
    expect(categoryIconUrlFor('services', 'dentista')).toBeNull();
  });
});
