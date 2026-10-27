import { PrismaService } from '@database/PrismaService';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { UploadService } from '../../upload/upload.service';
import { AdminCategoriesService } from './admin-categories.service';

const CONTEXTOS_SEM_TAXA = ['products', 'accommodations', 'transportations'] as const;

interface Cenario {
  service: AdminCategoriesService;
  removerArquivo: jest.Mock;
  buscarMuitos: jest.Mock;
  buscarUm: jest.Mock;
  buscarPrimeiro: jest.Mock;
  criar: jest.Mock;
  atualizar: jest.Mock;
}

function build(opcoes: { existente?: Record<string, unknown> | null } = {}): Cenario {
  const existente = opcoes.existente === undefined ? { id: 1, name: 'Limpeza' } : opcoes.existente;

  const buscarMuitos = jest.fn().mockResolvedValue([]);
  const buscarUm = jest.fn().mockResolvedValue(existente);
  const buscarPrimeiro = jest.fn().mockResolvedValue(null);
  const criar = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 9, ...data }));
  // O Prisma devolve a linha inteira no `update`, não só os campos enviados.
  const atualizar = jest
    .fn()
    .mockImplementation(({ data }) => Promise.resolve({ ...(existente ?? {}), ...data }));

  const delegate = {
    findMany: buscarMuitos,
    findUnique: buscarUm,
    findFirst: buscarPrimeiro,
    create: criar,
    update: atualizar,
  };

  const prisma = {
    serviceCategory: delegate,
    productCategory: delegate,
    accommodationCategory: delegate,
    transportationCategory: delegate,
  } as unknown as PrismaService;

  const removerArquivo = jest.fn().mockResolvedValue(undefined);
  const upload = { removeStoredFile: removerArquivo } as unknown as UploadService;

  return {
    service: new AdminCategoriesService(prisma, upload),
    removerArquivo,
    buscarMuitos,
    buscarUm,
    buscarPrimeiro,
    criar,
    atualizar,
  };
}

describe('AdminCategoriesService — contexto inválido', () => {
  it('recusa contexto que não existe', async () => {
    const { service } = build();

    await expect(service.findAll('restaurants')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AdminCategoriesService.findAll — taxa da plataforma no select', () => {
  it('pede platformFeeRate em services, que é quem tem a coluna', async () => {
    const { service, buscarMuitos } = build();

    await service.findAll('services');

    expect(buscarMuitos.mock.calls[0][0].select.platformFeeRate).toBe(true);
  });

  // Era aqui que os três contextos quebravam: o Prisma recusa a consulta antes
  // do banco e o filtro devolve 400 PRISMA_VALIDATION.
  it.each(CONTEXTOS_SEM_TAXA)('não pede platformFeeRate em %s', async (contexto) => {
    const { service, buscarMuitos } = build();

    await service.findAll(contexto);

    const select = buscarMuitos.mock.calls[0][0].select;
    expect('platformFeeRate' in select).toBe(false);
    expect(select.name).toBe(true);
    expect(select.sortOrder).toBe(true);
  });
});

describe('AdminCategoriesService.create — taxa da plataforma no data', () => {
  it('aplica o padrão de 10% quando services não informa a taxa', async () => {
    const { service, criar } = build();

    await service.create('services', { name: 'Limpeza', slug: 'limpeza' });

    expect(criar.mock.calls[0][0].data.platformFeeRate).toBe(10);
  });

  it('respeita a taxa informada em services', async () => {
    const { service, criar } = build();

    await service.create('services', { name: 'Limpeza', slug: 'limpeza', platformFeeRate: 7.5 });

    expect(criar.mock.calls[0][0].data.platformFeeRate).toBe(7.5);
  });

  it.each(CONTEXTOS_SEM_TAXA)('não manda platformFeeRate ao criar em %s', async (contexto) => {
    const { service, criar } = build();

    await service.create(contexto, { name: 'Bebidas', slug: 'bebidas' });

    expect('platformFeeRate' in criar.mock.calls[0][0].data).toBe(false);
    expect(criar.mock.calls[0][0].data.name).toBe('Bebidas');
  });

  // Ignorar em silêncio faria o admin achar que gravou uma taxa inexistente.
  it.each(CONTEXTOS_SEM_TAXA)('recusa taxa explícita ao criar em %s', async (contexto) => {
    const { service, criar } = build();

    await expect(
      service.create(contexto, { name: 'Bebidas', slug: 'bebidas', platformFeeRate: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(criar).not.toHaveBeenCalled();
  });

  it('continua recusando nome ou slug duplicado', async () => {
    const { service, buscarPrimeiro, criar } = build();
    buscarPrimeiro.mockResolvedValue({ id: 3 });

    await expect(
      service.create('services', { name: 'Limpeza', slug: 'limpeza' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(criar).not.toHaveBeenCalled();
  });
});

describe('AdminCategoriesService.update — taxa da plataforma', () => {
  it('deixa passar a taxa em services', async () => {
    const { service, atualizar } = build();

    await service.update('services', 1, { platformFeeRate: 12 });

    expect(atualizar.mock.calls[0][0].data.platformFeeRate).toBe(12);
  });

  it.each(CONTEXTOS_SEM_TAXA)('recusa a taxa em %s', async (contexto) => {
    const { service, atualizar } = build();

    await expect(service.update(contexto, 1, { platformFeeRate: 12 })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(atualizar).not.toHaveBeenCalled();
  });

  it.each(CONTEXTOS_SEM_TAXA)('edita os outros campos em %s', async (contexto) => {
    const { service, atualizar } = build();

    await service.update(contexto, 1, { name: 'Bebidas geladas' });

    expect(atualizar.mock.calls[0][0].data).toEqual({ name: 'Bebidas geladas' });
  });

  it('recusa editar categoria que não existe', async () => {
    const { service } = build({ existente: null });

    await expect(service.update('services', 99, { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AdminCategoriesService.inactivate', () => {
  it.each(CONTEXTOS_SEM_TAXA)('inativa em %s sem tocar na taxa', async (contexto) => {
    const { service, atualizar } = build();

    await service.inactivate(contexto, 1);

    expect(atualizar.mock.calls[0][0].data).toEqual({ isActive: false });
  });
});

describe('AdminCategoriesService — formato da taxa na resposta', () => {
  it('converte o Decimal de services em número', async () => {
    const { service, buscarUm } = build();
    buscarUm.mockResolvedValue({
      id: 1,
      name: 'Limpeza',
      platformFeeRate: new Prisma.Decimal('7.50'),
    });

    const categoria = await service.findOne('services', 1);

    expect(categoria.platformFeeRate).toBe(7.5);
    expect(typeof categoria.platformFeeRate).toBe('number');
  });

  it('omite a taxa quando a categoria não tem a coluna', async () => {
    const { service, buscarUm } = build();
    buscarUm.mockResolvedValue({ id: 1, name: 'Bebidas' });

    const categoria = await service.findOne('products', 1);

    expect(categoria.platformFeeRate).toBeUndefined();
  });
});

/**
 * Trocar a imagem sobrescreve a coluna, e com ela se perde a única referência
 * ao arquivo anterior — que ficava no bucket para sempre.
 */
describe('AdminCategoriesService.update — ícone antigo', () => {
  it('descarta do storage o ícone que saiu de uso', async () => {
    const { service, removerArquivo } = build({
      existente: { id: 1, name: 'Limpeza', iconKey: 'icones/antigo.png' },
    });

    await service.update('services', 1, { iconKey: 'icones/novo.png' });

    expect(removerArquivo).toHaveBeenCalledWith('icones/antigo.png');
  });

  it('descarta também quando a imagem é removida, não trocada', async () => {
    const { service, removerArquivo } = build({
      existente: { id: 1, name: 'Limpeza', iconKey: 'icones/antigo.png' },
    });

    await service.update('services', 1, { iconKey: null } as never);

    expect(removerArquivo).toHaveBeenCalledWith('icones/antigo.png');
  });

  it('não mexe no storage quando a chave não muda', async () => {
    const { service, removerArquivo } = build({
      existente: { id: 1, name: 'Limpeza', iconKey: 'icones/mesmo.png' },
    });

    await service.update('services', 1, { iconKey: 'icones/mesmo.png' });

    expect(removerArquivo).not.toHaveBeenCalled();
  });

  // Editar só o nome não manda `iconKey`; o Prisma devolve a linha com a chave
  // intacta, então nada deve ser apagado.
  it('não apaga nada ao editar outro campo', async () => {
    const { service, removerArquivo } = build({
      existente: { id: 1, name: 'Limpeza', iconKey: 'icones/mesmo.png' },
    });

    await service.update('services', 1, { name: 'Limpeza pesada' });

    expect(removerArquivo).not.toHaveBeenCalled();
  });

  it('não tenta apagar quando a categoria não tinha imagem', async () => {
    const { service, removerArquivo } = build({
      existente: { id: 1, name: 'Limpeza', iconKey: null },
    });

    await service.update('services', 1, { iconKey: 'icones/novo.png' });

    expect(removerArquivo).not.toHaveBeenCalled();
  });

  /**
   * A categoria já está gravada quando a limpeza roda. Recusar a resposta por
   * causa de um arquivo órfão trocaria um problema pequeno por um grande.
   */
  it('conclui a edição mesmo se o storage falhar', async () => {
    const { service, removerArquivo } = build({
      existente: { id: 1, name: 'Limpeza', iconKey: 'icones/antigo.png' },
    });
    removerArquivo.mockRejectedValue(new Error('S3 fora do ar'));

    const categoria = await service.update('services', 1, { iconKey: 'icones/novo.png' });

    expect(categoria.iconKey).toBe('icones/novo.png');
  });

  it('não mexe no storage ao inativar', async () => {
    const { service, removerArquivo } = build({
      existente: { id: 1, name: 'Limpeza', iconKey: 'icones/mesmo.png' },
    });

    await service.inactivate('services', 1);

    expect(removerArquivo).not.toHaveBeenCalled();
  });
});
