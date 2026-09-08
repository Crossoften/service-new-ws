import {
  buildServiceCategoryPublicIconUrl,
  serviceCategoryDefinitions,
  serviceCategoryIconExists,
} from './service-category.constants';

describe('serviceCategoryIconExists', () => {
  it('reconhece o ícone que existe no repositório', () => {
    expect(serviceCategoryIconExists('service-categories/pintor.png')).toBe(true);
  });

  it('recusa ícone declarado sem arquivo correspondente', () => {
    expect(serviceCategoryIconExists('service-categories/nao-existe.png')).toBe(false);
  });

  it('a maioria das categorias declara ícone que não existe — é o motivo da guarda', () => {
    const semArquivo = serviceCategoryDefinitions.filter(
      (categoria) => !serviceCategoryIconExists(categoria.localIcon),
    );

    // Sem a guarda, `SERVICE_CATEGORY_PUBLIC_URL_BASE` preenchida geraria uma
    // URL para cada uma destas, todas apontando para arquivo inexistente.
    expect(semArquivo.length).toBeGreaterThan(0);
  });
});

describe('buildServiceCategoryPublicIconUrl', () => {
  it('devolve null sem base pública configurada', () => {
    expect(buildServiceCategoryPublicIconUrl('service-categories/pintor.png')).toBeNull();
  });

  it('monta a URL removendo barras duplicadas nas junções', () => {
    expect(
      buildServiceCategoryPublicIconUrl(
        '/service-categories/pintor.png',
        'https://cdn.exemplo.com/',
      ),
    ).toBe('https://cdn.exemplo.com/service-categories/pintor.png');
  });
});

describe('definições das categorias de serviço', () => {
  it('nenhum ícone declarado escapa da pasta por caminho relativo', () => {
    for (const categoria of serviceCategoryDefinitions) {
      expect(categoria.localIcon).not.toContain('..');
    }
  });

  it('todo slug é único', () => {
    const slugs = serviceCategoryDefinitions.map((c) => c.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
