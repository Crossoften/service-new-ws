import { PrismaService } from '@database/PrismaService';
import { ConfigService } from '@nestjs/config';

import { Readable } from 'stream';

import { UploadFileNotFoundException } from './exceptions/upload-file-not-found.exception';
import { UploadService } from './upload.service';

type Env = Record<string, string | undefined>;

const ENV_AWS: Env = {
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'chave',
  AWS_SECRET_ACCESS_KEY: 'segredo',
  AWS_BUCKET_NAME: 'bucket-de-teste',
};

function build(env: Env = {}, prismaFake?: unknown): UploadService {
  const configService = { get: (chave: string) => env[chave] } as unknown as ConfigService;
  const prisma = (prismaFake ?? { file: { create: jest.fn() } }) as unknown as PrismaService;

  return new UploadService(configService, prisma);
}

function chave(service: UploadService, nome: string): string {
  return (service as unknown as { safeKey: (n: string) => string }).safeKey(nome);
}

describe('UploadService — escolha do armazenamento', () => {
  it('usa S3 quando as quatro variáveis estão presentes', () => {
    expect(build(ENV_AWS).usesS3()).toBe(true);
  });

  it('cai no disco quando falta o bucket', () => {
    expect(build({ ...ENV_AWS, AWS_BUCKET_NAME: undefined }).usesS3()).toBe(false);
  });

  it('cai no disco quando falta a credencial', () => {
    expect(build({ ...ENV_AWS, AWS_SECRET_ACCESS_KEY: undefined }).usesS3()).toBe(false);
  });

  it('cai no disco quando não há nenhuma variável', () => {
    // Era exatamente este o caso que respondia 500 a cada upload: o cliente do
    // S3 era construído mesmo assim e estourava no `send`.
    expect(build().usesS3()).toBe(false);
  });
});

describe('UploadService — chave de arquivo', () => {
  const service = build();

  it('mantém o nome e a extensão do arquivo enviado', () => {
    expect(chave(service, 'cardapio.png')).toMatch(/^\d+-cardapio\.png$/);
  });

  it('descarta o caminho: nome com diretório não escapa da pasta de uploads', () => {
    const gerada = chave(service, '../../../../tmp/invadido.png');

    expect(gerada).toMatch(/^\d+-invadido\.png$/);
    expect(gerada).not.toContain('..');
    expect(gerada).not.toContain('/');
  });

  it('troca caracteres fora do conjunto seguro', () => {
    expect(chave(service, 'foto do José & cia (1).jpg')).toMatch(/^\d+-foto-do-Jos-cia-1-\.jpg$/);
  });

  it('sobrevive a nome vazio', () => {
    expect(chave(service, '')).toMatch(/^\d+-arquivo$/);
  });

  it('limita o tamanho do nome', () => {
    const gerada = chave(service, `${'a'.repeat(300)}.png`);

    expect(gerada.length).toBeLessThan(120);
    expect(gerada.endsWith('.png')).toBe(true);
  });
});

describe('UploadService — URL pública do arquivo', () => {
  const COM_S3 = { ...ENV_AWS, URL_INTEGRATION: 'https://api.exemplo.com' };

  it('aponta para a API, e não para o bucket, mesmo com S3 ligado', () => {
    // O bucket é privado: a URL do objeto não abre para ninguém. E esta URL é
    // gravada em dezesseis tabelas, então precisa ser estável — pré-assinada
    // expiraria dentro da coluna.
    expect(build(COM_S3).fileUrlFor('123-foto.png')).toBe(
      'https://api.exemplo.com/v1/files/123-foto.png',
    );
  });

  it('usa a mesma forma no armazenamento em disco', () => {
    expect(build({ URL_INTEGRATION: 'https://api.exemplo.com' }).fileUrlFor('123-foto.png')).toBe(
      'https://api.exemplo.com/v1/files/123-foto.png',
    );
  });

  it('cai em localhost com a porta configurada quando não há URL pública', () => {
    expect(build({ PORT: '8000' }).fileUrlFor('a.png')).toBe(
      'http://localhost:8000/v1/files/a.png',
    );
  });

  it('não duplica a barra quando a URL pública termina com uma', () => {
    expect(build({ URL_INTEGRATION: 'https://api.exemplo.com/' }).fileUrlFor('a.png')).toBe(
      'https://api.exemplo.com/v1/files/a.png',
    );
  });

  it('grava no banco a mesma URL que o helper devolve', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 1, fileUrl: data.fileUrl, fileKey: data.fileKey }),
      );
    const service = build(COM_S3, { file: { create } });

    const salvo = await (
      service as unknown as {
        persist: (k: string, u: number) => Promise<{ fileUrl: string }>;
      }
    ).persist('123-foto.png', 7);

    expect(salvo.fileUrl).toBe('https://api.exemplo.com/v1/files/123-foto.png');
  });
});

describe('UploadService — leitura pela chave', () => {
  const ENV = { ...ENV_AWS, URL_INTEGRATION: 'https://api.exemplo.com' };

  /** Substitui o `S3Client` interno por um duplo, sem tocar no construtor. */
  function comS3(send: jest.Mock): UploadService {
    const service = build(ENV);
    (service as unknown as { s3Client: { send: jest.Mock } }).s3Client = { send };

    return service;
  }

  it('busca no bucket quando o S3 está ligado', async () => {
    const send = jest.fn().mockResolvedValue({
      Body: Readable.from([Buffer.from('conteudo')]),
      ContentType: 'image/png',
    });

    const aberto = await comS3(send).openByKey('123-foto.png');

    expect(aberto.contentType).toBe('image/png');
    expect(aberto.fileName).toBe('123-foto.png');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('usa só o nome do arquivo, nunca o caminho recebido', async () => {
    const send = jest.fn().mockResolvedValue({ Body: Readable.from([]), ContentType: 'image/png' });

    await comS3(send).openByKey('../../etc/passwd');

    // `basename` antes da consulta: sem isso, a chave do cliente iria crua para
    // o bucket, e no disco seria travessia de caminho.
    const comando = send.mock.calls[0][0];
    expect(comando.input.Key).toBe('passwd');
  });

  it('chave inexistente no bucket vira 404', async () => {
    const naoExiste = Object.assign(new Error('nao existe'), { name: 'NoSuchKey' });

    await expect(comS3(jest.fn().mockRejectedValue(naoExiste)).openByKey('x.png')).rejects.toThrow(
      UploadFileNotFoundException,
    );
  });

  it('credencial inválida NÃO vira 404: sobe como está', async () => {
    // Transformar qualquer falha em "arquivo não encontrado" esconderia bucket
    // errado e chave revogada — o sintoma seria "a foto sumiu", e ninguém
    // procuraria a causa na configuração.
    const semPermissao = Object.assign(new Error('negado'), { name: 'AccessDenied' });

    await expect(
      comS3(jest.fn().mockRejectedValue(semPermissao)).openByKey('x.png'),
    ).rejects.toThrow('negado');
  });

  it('resposta sem corpo vira 404', async () => {
    await expect(
      comS3(jest.fn().mockResolvedValue({ Body: undefined })).openByKey('x.png'),
    ).rejects.toThrow(UploadFileNotFoundException);
  });

  it('sem S3, arquivo ausente no disco vira 404', async () => {
    await expect(build().openByKey('nao-existe-mesmo.png')).rejects.toThrow(
      UploadFileNotFoundException,
    );
  });
});
