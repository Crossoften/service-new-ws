import { PrismaService } from '@database/PrismaService';
import { ConfigService } from '@nestjs/config';

import { UploadService } from './upload.service';

/**
 * `removeStoredFile` existe para quem é dono do **uso** do arquivo, não do
 * envio: a imagem de uma categoria pertence à categoria, e `deleteFileById`
 * só deixa o próprio remetente apagar.
 *
 * Sem credencial de S3 o serviço cai no disco local, que é o caminho exercido
 * aqui — é o suficiente para fixar as duas garantias que importam: chave vazia
 * não mexe em nada, e chave presente remove o registro.
 */
function build(): { service: UploadService; apagarRegistros: jest.Mock } {
  const config = { get: () => undefined } as unknown as ConfigService;
  const apagarRegistros = jest.fn().mockResolvedValue({ count: 1 });
  const prisma = { file: { deleteMany: apagarRegistros } } as unknown as PrismaService;

  return { service: new UploadService(config, prisma), apagarRegistros };
}

describe('UploadService.removeStoredFile', () => {
  it('não mexe em nada quando a chave vem vazia', async () => {
    const { service, apagarRegistros } = build();

    await service.removeStoredFile('');

    expect(apagarRegistros).not.toHaveBeenCalled();
  });

  it('apaga o registro do arquivo pela chave', async () => {
    const { service, apagarRegistros } = build();

    await service.removeStoredFile('icones/antigo.png');

    expect(apagarRegistros).toHaveBeenCalledWith({ where: { fileKey: 'icones/antigo.png' } });
  });

  // Arquivo já ausente no disco não é erro: a chave pode ser mais antiga que a
  // tabela `File`, ou já ter sido removida.
  it('conclui quando o arquivo não está mais no storage', async () => {
    const { service } = build();

    await expect(service.removeStoredFile('icones/que-nao-existe.png')).resolves.toBeUndefined();
  });
});
