import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Rede de segurança para erros do Prisma que escapem do tratamento por módulo.
 *
 * Os services de domínio já validam antes de gravar e lançam exceções tipadas
 * (`WorkNotFoundException`, `409` em duplicidade, etc.), então este filtro não
 * substitui nada: ele cobre o que ninguém previu — violação de chave estrangeira
 * ao remover um registro referenciado, corrida entre duas requisições que passam
 * pela mesma pré-checagem, coluna estourada. Sem ele, esses casos viram
 * `500 Internal server error` sem indicação do que houve.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message, error } = this.translate(exception);

    // A mensagem devolvida é sempre genérica; o detalhe (com nomes de coluna e
    // constraint) fica só no log do servidor.
    this.logger.error(
      `${exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : 'VALIDATION'}: ${exception.message.replace(/\n/g, ' ')}`,
    );

    response.status(status).json({ message, error, statusCode: status });
  }

  private translate(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
  ): {
    status: number;
    message: string;
    error: string;
  } {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Requisição inválida.',
        error: 'Bad Request',
      };
    }

    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Já existe um registro com os dados informados.',
          error: 'Conflict',
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'O registro está vinculado a outros dados e não pode ser removido.',
          error: 'Conflict',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Registro não encontrado.',
          error: 'Not Found',
        };
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Um dos valores informados excede o tamanho permitido.',
          error: 'Bad Request',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro interno no servidor.',
          error: 'Internal Server Error',
        };
    }
  }
}
