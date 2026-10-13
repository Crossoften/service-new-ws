import { PrismaService } from '@database/PrismaService';

import { AccommodationsService } from '../../src/modules/accommodations/accommodations.service';
import { ProductsService } from '../../src/modules/products/products.service';
import { TransportationsService } from '../../src/modules/transportations/transportations.service';
import { SubscriptionGuardService } from '../../src/modules/subscription-guard/subscription-guard.service';
import { criarCategoriaDeAnuncio, criarFornecedorComAssinatura, limparBanco, prisma } from './db';

/**
 * O vídeo dos anúncios, atravessando o caminho inteiro.
 *
 * A mudança é mecânica — duas colunas, dois campos de DTO, um par de linhas em
 * cada mapeamento —, e é justamente por isso que merece teste: um `select` que
 * esquece `videoUrl` não quebra compilação nem teste nenhum. O sintoma seria o
 * vídeo sumir da resposta, e só o front descobriria, semanas depois.
 */
describe('vídeo em anúncios', () => {
  const prismaService = prisma as unknown as PrismaService;
  const guard = new SubscriptionGuardService(prismaService);

  const produtos = new ProductsService(prismaService, guard);
  const hospedagens = new AccommodationsService(prismaService, guard);
  const transportes = new TransportationsService(prismaService, guard);

  const VIDEO = {
    videoUrl: 'https://api.exemplo.com/v1/files/1791-apresentacao.mp4',
    videoKey: '1791-apresentacao.mp4',
  };

  beforeEach(limparBanco);
  afterAll(() => prisma.$disconnect());

  it('produto guarda e devolve o vídeo na criação e no detalhe', async () => {
    const dono = await criarFornecedorComAssinatura();
    const categoria = await criarCategoriaDeAnuncio('product');

    const criado = await produtos.create(dono, {
      name: 'Furadeira',
      transactionType: 'Sale',
      price: 200,
      categoryId: categoria.id,
      ...VIDEO,
    } as never);

    expect(criado.product.videoUrl).toBe(VIDEO.videoUrl);
    expect(criado.product.videoKey).toBe(VIDEO.videoKey);

    const detalhe = await produtos.findById(criado.product.id);
    expect(detalhe.videoUrl).toBe(VIDEO.videoUrl);
    expect(detalhe.videoKey).toBe(VIDEO.videoKey);
  });

  it('produto devolve o vídeo também na listagem', async () => {
    const dono = await criarFornecedorComAssinatura();
    const categoria = await criarCategoriaDeAnuncio('product');

    await produtos.create(dono, {
      name: 'Furadeira',
      transactionType: 'Sale',
      price: 200,
      categoryId: categoria.id,
      ...VIDEO,
    } as never);

    const lista = await produtos.findAll({} as never);

    // A listagem carrega a URL e não a chave, seguindo a convenção que já
    // valia para a imagem: a chave só serve para apagar o arquivo.
    expect(lista.products[0].videoUrl).toBe(VIDEO.videoUrl);
  });

  it('hospedagem guarda e devolve o vídeo', async () => {
    const dono = await criarFornecedorComAssinatura();
    const categoria = await criarCategoriaDeAnuncio('accommodation');

    const criado = await hospedagens.create(dono, {
      name: 'Chalé da serra',
      price: 300,
      categoryId: categoria.id,
      ...VIDEO,
    } as never);

    expect(criado.accommodation.videoUrl).toBe(VIDEO.videoUrl);

    const detalhe = await hospedagens.findById(criado.accommodation.id);
    expect(detalhe.videoKey).toBe(VIDEO.videoKey);
  });

  it('transporte guarda e devolve o vídeo', async () => {
    const dono = await criarFornecedorComAssinatura();
    const categoria = await criarCategoriaDeAnuncio('transportation');

    const criado = await transportes.create(dono, {
      name: 'Caminhão baú',
      price: 500,
      categoryId: categoria.id,
      ...VIDEO,
    } as never);

    expect(criado.transportation.videoUrl).toBe(VIDEO.videoUrl);

    const detalhe = await transportes.findById(criado.transportation.id);
    expect(detalhe.videoKey).toBe(VIDEO.videoKey);
  });

  it('anúncio sem vídeo continua válido — o campo é opcional', async () => {
    const dono = await criarFornecedorComAssinatura();
    const categoria = await criarCategoriaDeAnuncio('product');

    const criado = await produtos.create(dono, {
      name: 'Sem vídeo',
      transactionType: 'Sale',
      price: 50,
      categoryId: categoria.id,
    } as never);

    expect(criado.product.videoUrl).toBeUndefined();
    expect(criado.product.videoKey).toBeUndefined();
  });

  it('a edição troca o vídeo e consegue removê-lo', async () => {
    const dono = await criarFornecedorComAssinatura();
    const categoria = await criarCategoriaDeAnuncio('product');

    const criado = await produtos.create(dono, {
      name: 'Furadeira',
      transactionType: 'Sale',
      price: 200,
      categoryId: categoria.id,
      ...VIDEO,
    } as never);

    await produtos.update(dono, criado.product.id, { videoUrl: '', videoKey: '' } as never);

    // String vazia vira `null` na coluna: é como o anúncio perde o vídeo sem
    // precisar de rota própria para isso.
    const semVideo = await produtos.findById(criado.product.id);
    expect(semVideo.videoUrl).toBeUndefined();
  });
});
