import { Readable, Writable } from 'stream';

import { Response } from 'express';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

/**
 * Cobre os cabeçalhos da rota que serve arquivo.
 *
 * Existe por um motivo específico: o `Cross-Origin-Resource-Policy` é a única
 * coisa nesta resposta cuja ausência **não aparece** em teste de API. O arquivo
 * sai com `200` e íntegro; quem recusa é o navegador, na hora de pintar a
 * imagem. Sem este teste, remover a linha não quebra nada visível aqui e quebra
 * toda a mídia do produto.
 */
/**
 * O `serveFile` termina em `stream.pipe(res)`, então o duplo precisa ser um
 * destino gravável de verdade — um objeto só com `set` faz o `pipe` estourar.
 */
function resposta(): { res: Response; set: jest.Mock } {
  const set = jest.fn();
  const escrita = new Writable({
    write(_pedaco, _codificacao, pronto) {
      pronto();
    },
  });

  return { res: Object.assign(escrita, { set }) as unknown as Response, set };
}

function montar(): { controller: UploadController; res: Response; set: jest.Mock } {
  const service = {
    openByKey: jest.fn().mockResolvedValue({
      stream: Readable.from(['conteudo']),
      fileName: 'foto.png',
      contentType: 'image/png',
    }),
  } as unknown as UploadService;

  const { res, set } = resposta();

  return { controller: new UploadController(service), res, set };
}

describe('UploadController · GET files/:fileKey', () => {
  it('declara Cross-Origin-Resource-Policy: cross-origin', async () => {
    const { controller, res, set } = montar();

    await controller.serveFile('123-foto.png', res);

    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0]).toMatchObject({
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
  });

  it('mantém os demais cabeçalhos da resposta', async () => {
    const { controller, res, set } = montar();

    await controller.serveFile('123-foto.png', res);

    expect(set.mock.calls[0][0]).toMatchObject({
      'Content-Disposition': 'inline; filename="foto.png"',
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  });

  it('cai no tipo pela extensão quando o armazenamento não informa', async () => {
    const service = {
      openByKey: jest.fn().mockResolvedValue({
        stream: Readable.from(['x']),
        fileName: 'documento.pdf',
        contentType: undefined,
      }),
    } as unknown as UploadService;

    const { res, set } = resposta();

    await new UploadController(service).serveFile('1-documento.pdf', res);

    expect(set.mock.calls[0][0]['Content-Type']).toBe('application/pdf');
  });
});
