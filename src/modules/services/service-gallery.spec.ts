import { PrismaService } from '@database/PrismaService';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UploadService } from '../upload/upload.service';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { WarrantyStatsService } from '../works/warranty-stats.service';
import { CreateServiceDto, MAXIMO_DE_IMAGENS } from './dto/create-service.dto';
import { ServiceImageInputDto } from './dto/service-image.dto';
import { ServiceTypeEnum } from './enums/service-type.enum';
import { ServicesService } from './services.service';

const BASE = {
  name: 'Instalação elétrica',
  type: ServiceTypeEnum.Presential,
  categoryId: 1,
};

const URL_LOCAL = 'http://localhost:8000/v1/files/foto.png';

function imagem(chave: string, ordem?: number): Record<string, unknown> {
  return { fileUrl: `http://localhost:8000/v1/files/${chave}`, fileKey: chave, sortOrder: ordem };
}

async function propriedadesInvalidas(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateServiceDto, { ...BASE, ...payload });

  return (await validate(dto)).map((falha) => falha.property);
}

describe('CreateServiceDto — galeria e vídeo', () => {
  it('aceita serviço sem galeria nem vídeo, como antes', async () => {
    expect(await propriedadesInvalidas({})).toEqual([]);
  });

  it('aceita a URL local que a própria API emite', async () => {
    expect(await propriedadesInvalidas({ videoUrl: URL_LOCAL })).not.toContain('videoUrl');
    expect(await propriedadesInvalidas({ images: [imagem('a.png')] })).not.toContain('images');
  });

  it('recusa vídeo que não é URL', async () => {
    expect(await propriedadesInvalidas({ videoUrl: 'não é url' })).toContain('videoUrl');
  });

  it('aceita galeria vazia, que é o pedido para esvaziar', async () => {
    expect(await propriedadesInvalidas({ images: [] })).toEqual([]);
  });

  it('recusa galeria acima do teto', async () => {
    const acima = Array.from({ length: MAXIMO_DE_IMAGENS + 1 }, (_, i) => imagem(`f${i}.png`));

    expect(await propriedadesInvalidas({ images: acima })).toContain('images');
  });

  it('aceita galeria no teto', async () => {
    const noTeto = Array.from({ length: MAXIMO_DE_IMAGENS }, (_, i) => imagem(`f${i}.png`));

    expect(await propriedadesInvalidas({ images: noTeto })).not.toContain('images');
  });

  // Sem `@ValidateNested` o array passaria com qualquer objeto dentro.
  it('valida cada imagem da lista, não só o array', async () => {
    expect(
      await propriedadesInvalidas({ images: [{ fileUrl: 'não é url', fileKey: 'a.png' }] }),
    ).toContain('images');
  });

  it('recusa imagem sem chave', async () => {
    expect(await propriedadesInvalidas({ images: [{ fileUrl: URL_LOCAL }] })).toContain('images');
  });

  it('recusa ordem negativa', async () => {
    expect(await propriedadesInvalidas({ images: [imagem('a.png', -1)] })).toContain('images');
  });

  it('transforma cada item em ServiceImageInputDto', async () => {
    const dto = plainToInstance(CreateServiceDto, { ...BASE, images: [imagem('a.png')] });

    expect(dto.images?.[0]).toBeInstanceOf(ServiceImageInputDto);
  });
});

interface Cenario {
  service: ServicesService;
  buscarArquivos: jest.Mock;
  apagarMuitos: jest.Mock;
  criarArquivo: jest.Mock;
  atualizarArquivo: jest.Mock;
  transacao: jest.Mock;
  removerDoStorage: jest.Mock;
}

function build(atuais: { id: number; fileKey: string }[] = []): Cenario {
  const buscarArquivos = jest.fn().mockResolvedValue(atuais);
  const apagarMuitos = jest.fn().mockImplementation((args) => ({ op: 'deleteMany', args }));
  const criarArquivo = jest.fn().mockImplementation((args) => ({ op: 'create', args }));
  const atualizarArquivo = jest.fn().mockImplementation((args) => ({ op: 'update', args }));
  const transacao = jest.fn().mockImplementation((ops) => Promise.resolve(ops));

  const prisma = {
    serviceFile: {
      findMany: buscarArquivos,
      deleteMany: apagarMuitos,
      create: criarArquivo,
      update: atualizarArquivo,
    },
    $transaction: transacao,
  } as unknown as PrismaService;

  const removerDoStorage = jest.fn().mockResolvedValue(undefined);
  const upload = { removeStoredFile: removerDoStorage } as unknown as UploadService;

  const service = new ServicesService(
    {} as WarrantyStatsService,
    prisma,
    upload,
    {} as SubscriptionGuardService,
  );

  return {
    service,
    buscarArquivos,
    apagarMuitos,
    criarArquivo,
    atualizarArquivo,
    transacao,
    removerDoStorage,
  };
}

/** Os métodos da galeria são privados; o acesso por índice é só no teste. */
function galeria(service: ServicesService) {
  return service as unknown as {
    montarGaleria(imagens: ServiceImageInputDto[]): {
      fileUrl: string;
      fileKey: string;
      sortOrder: number;
    }[];
    reconciliarGaleria(serviceId: number, imagens: ServiceImageInputDto[]): Promise<void>;
    descartarGaleria(serviceId: number): Promise<void>;
  };
}

function entrada(chave: string, ordem?: number): ServiceImageInputDto {
  return plainToInstance(ServiceImageInputDto, imagem(chave, ordem));
}

describe('ServicesService — ordem da galeria', () => {
  it('usa a posição no array quando a ordem não vem', () => {
    const { service } = build();

    const montada = galeria(service).montarGaleria([
      entrada('a.png'),
      entrada('b.png'),
      entrada('c.png'),
    ]);

    expect(montada.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });

  it('respeita a ordem informada', () => {
    const { service } = build();

    const montada = galeria(service).montarGaleria([entrada('a.png', 5), entrada('b.png', 2)]);

    expect(montada.map((i) => i.sortOrder)).toEqual([5, 2]);
  });

  // Zero é uma ordem válida — a primeira. Tratar como ausente jogaria a imagem
  // para o índice do array, que pode ser outro.
  it('não confunde ordem zero com ordem ausente', () => {
    const { service } = build();

    const montada = galeria(service).montarGaleria([entrada('a.png'), entrada('b.png', 0)]);

    expect(montada.map((i) => i.sortOrder)).toEqual([0, 0]);
  });
});

describe('ServicesService — reconciliação da galeria', () => {
  it('cria as imagens novas', async () => {
    const { service, criarArquivo, apagarMuitos } = build([]);

    await galeria(service).reconciliarGaleria(7, [entrada('a.png'), entrada('b.png')]);

    expect(criarArquivo).toHaveBeenCalledTimes(2);
    expect(criarArquivo.mock.calls[0][0].data).toEqual({
      fileUrl: 'http://localhost:8000/v1/files/a.png',
      fileKey: 'a.png',
      sortOrder: 0,
      serviceId: 7,
    });
    expect(apagarMuitos).not.toHaveBeenCalled();
  });

  /**
   * Quem continua na galeria mantém o `id`. Apagar tudo e reinserir mudaria o
   * id a cada edição, e um link para a imagem deixaria de funcionar só porque
   * o fornecedor reordenou a galeria.
   */
  it('mantém o id de quem continua, em vez de apagar e recriar', async () => {
    const { service, atualizarArquivo, criarArquivo, apagarMuitos } = build([
      { id: 10, fileKey: 'a.png' },
      { id: 11, fileKey: 'b.png' },
    ]);

    await galeria(service).reconciliarGaleria(7, [entrada('b.png'), entrada('a.png')]);

    expect(criarArquivo).not.toHaveBeenCalled();
    expect(apagarMuitos).not.toHaveBeenCalled();
    expect(atualizarArquivo).toHaveBeenCalledTimes(2);
    expect(atualizarArquivo.mock.calls[0][0]).toEqual({
      where: { id: 11 },
      data: { fileUrl: 'http://localhost:8000/v1/files/b.png', sortOrder: 0 },
    });
    expect(atualizarArquivo.mock.calls[1][0].where).toEqual({ id: 10 });
    expect(atualizarArquivo.mock.calls[1][0].data.sortOrder).toBe(1);
  });

  it('remove do banco e do storage quem saiu da lista', async () => {
    const { service, apagarMuitos, removerDoStorage } = build([
      { id: 10, fileKey: 'a.png' },
      { id: 11, fileKey: 'b.png' },
    ]);

    await galeria(service).reconciliarGaleria(7, [entrada('a.png')]);

    expect(apagarMuitos).toHaveBeenCalledWith({ where: { id: { in: [11] } } });
    expect(removerDoStorage).toHaveBeenCalledWith('b.png');
    expect(removerDoStorage).toHaveBeenCalledTimes(1);
  });

  it('esvazia a galeria quando a lista vem vazia', async () => {
    const { service, apagarMuitos, removerDoStorage, criarArquivo } = build([
      { id: 10, fileKey: 'a.png' },
    ]);

    await galeria(service).reconciliarGaleria(7, []);

    expect(apagarMuitos).toHaveBeenCalledWith({ where: { id: { in: [10] } } });
    expect(removerDoStorage).toHaveBeenCalledWith('a.png');
    expect(criarArquivo).not.toHaveBeenCalled();
  });

  it('troca uma imagem por outra numa só passada', async () => {
    const { service, apagarMuitos, criarArquivo, removerDoStorage } = build([
      { id: 10, fileKey: 'antiga.png' },
    ]);

    await galeria(service).reconciliarGaleria(7, [entrada('nova.png')]);

    expect(apagarMuitos).toHaveBeenCalledWith({ where: { id: { in: [10] } } });
    expect(criarArquivo.mock.calls[0][0].data.fileKey).toBe('nova.png');
    expect(removerDoStorage).toHaveBeenCalledWith('antiga.png');
  });

  it('escreve banco numa transação só', async () => {
    const { service, transacao } = build([{ id: 10, fileKey: 'a.png' }]);

    await galeria(service).reconciliarGaleria(7, [entrada('b.png')]);

    expect(transacao).toHaveBeenCalledTimes(1);
    expect(transacao.mock.calls[0][0]).toHaveLength(2);
  });

  /**
   * O serviço já está gravado quando a limpeza roda. Recusar a resposta por
   * causa de um arquivo órfão trocaria um problema pequeno por um grande.
   */
  it('conclui a edição mesmo se o storage falhar', async () => {
    const { service, removerDoStorage } = build([{ id: 10, fileKey: 'a.png' }]);
    removerDoStorage.mockRejectedValue(new Error('S3 fora do ar'));

    await expect(galeria(service).reconciliarGaleria(7, [])).resolves.toBeUndefined();
  });

  it('não chama o storage quando nada saiu', async () => {
    const { service, removerDoStorage } = build([{ id: 10, fileKey: 'a.png' }]);

    await galeria(service).reconciliarGaleria(7, [entrada('a.png')]);

    expect(removerDoStorage).not.toHaveBeenCalled();
  });
});

describe('ServicesService — descarte da galeria', () => {
  it('apaga banco e storage de todas as imagens', async () => {
    const { service, apagarMuitos, removerDoStorage } = build([
      { id: 10, fileKey: 'a.png' },
      { id: 11, fileKey: 'b.png' },
    ]);

    await galeria(service).descartarGaleria(7);

    expect(apagarMuitos).toHaveBeenCalledWith({ where: { serviceId: 7 } });
    expect(removerDoStorage.mock.calls.map((c) => c[0])).toEqual(['a.png', 'b.png']);
  });

  it('não toca em nada quando o serviço não tem galeria', async () => {
    const { service, apagarMuitos, removerDoStorage } = build([]);

    await galeria(service).descartarGaleria(7);

    expect(apagarMuitos).not.toHaveBeenCalled();
    expect(removerDoStorage).not.toHaveBeenCalled();
  });
});
