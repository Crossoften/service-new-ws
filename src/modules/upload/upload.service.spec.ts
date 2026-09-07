import { PrismaService } from '@database/PrismaService';
import { ConfigService } from '@nestjs/config';

import { UploadService } from './upload.service';

type Env = Record<string, string | undefined>;

const ENV_AWS: Env = {
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'chave',
  AWS_SECRET_ACCESS_KEY: 'segredo',
  AWS_BUCKET_NAME: 'bucket-de-teste',
};

function build(env: Env = {}): UploadService {
  const configService = { get: (chave: string) => env[chave] } as unknown as ConfigService;
  const prisma = { file: { create: jest.fn() } } as unknown as PrismaService;

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
