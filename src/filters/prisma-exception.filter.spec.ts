import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaErrorCode, PrismaExceptionFilter } from './prisma-exception.filter';

/**
 * O contrato desta rede de segurança.
 *
 * Ela existe justamente para o que ninguém previu, então é o único lugar da API
 * em que a resposta não vem de uma exceção tipada do domínio. Sem teste, o
 * formato dela só é conferido quando alguém já está caçando um bug em produção.
 */
describe('PrismaExceptionFilter', () => {
  function capturar(exception: unknown) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    const filter = new PrismaExceptionFilter();
    // O filtro loga a causa real; silenciar mantém a saída do jest legível.
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);

    filter.catch(exception as never, host);

    return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
  }

  const conhecido = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('detalhe interno', {
      code,
      clientVersion: '5.13.0',
    });

  it('traduz erro de validação do client e devolve PRISMA_VALIDATION', () => {
    const { status, body } = capturar(
      new Prisma.PrismaClientValidationError('Unknown argument `cancelAtPeriodEnd`', {
        clientVersion: '5.13.0',
      }),
    );

    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(body.code).toBe(PrismaErrorCode.PrismaValidation);
  });

  it('não vaza o detalhe do Prisma na resposta', () => {
    const { body } = capturar(
      new Prisma.PrismaClientValidationError('Unknown argument `cancelAtPeriodEnd`', {
        clientVersion: '5.13.0',
      }),
    );

    // Nome de coluna e de constraint ficam só no log do servidor. A mensagem
    // devolvida é sempre a genérica — é o `code` que carrega a informação útil.
    expect(JSON.stringify(body)).not.toContain('cancelAtPeriodEnd');
    expect(body.message).toBe('Requisição inválida.');
  });

  it.each([
    ['P2002', HttpStatus.CONFLICT, PrismaErrorCode.UniqueConstraint],
    ['P2003', HttpStatus.CONFLICT, PrismaErrorCode.ForeignKeyConstraint],
    ['P2025', HttpStatus.NOT_FOUND, PrismaErrorCode.RecordNotFound],
    ['P2000', HttpStatus.BAD_REQUEST, PrismaErrorCode.ValueTooLong],
  ])('%s vira %i com código %s', (prismaCode, esperado, code) => {
    const { status, body } = capturar(conhecido(prismaCode as string));

    expect(status).toBe(esperado);
    expect(body.code).toBe(code);
  });

  it('código desconhecido do Prisma vira 500, não 400', () => {
    // Só o que o filtro sabe traduzir vira erro do cliente. O resto é problema
    // do servidor, e responder 400 faria o front procurar culpa no corpo dele.
    const { status, body } = capturar(conhecido('P9999'));

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.code).toBe(PrismaErrorCode.Unexpected);
  });

  it('toda resposta traz message, error, statusCode e code', () => {
    const { body } = capturar(conhecido('P2002'));

    expect(Object.keys(body).sort()).toEqual(['code', 'error', 'message', 'statusCode']);
  });

  it('statusCode do corpo bate com o status HTTP', () => {
    const { status, body } = capturar(conhecido('P2025'));

    expect(body.statusCode).toBe(status);
  });
});
