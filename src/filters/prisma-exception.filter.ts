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
 *
 * A resposta carrega um `code` estável além da mensagem. Sem ele, quem consome
 * a API recebe `"Requisição inválida."` e não tem como separar "o corpo que eu
 * mandei está errado" de "o back está com o client do Prisma desatualizado" —
 * dois problemas de donos diferentes, com o mesmo texto. O `code` é contrato:
 * pode ser comparado em `if`, não muda quando a mensagem for reescrita, e não
 * revela nome de coluna nem de constraint.
 */
/**
 * Códigos estáveis devolvidos por este filtro.
 *
 * São contrato com o front: renomear um valor daqui quebra tratamento de erro
 * do outro lado, do mesmo jeito que mudar o nome de um campo do DTO.
 */
export enum PrismaErrorCode {
  PrismaValidation = 'PRISMA_VALIDATION',
  UniqueConstraint = 'UNIQUE_CONSTRAINT',
  ForeignKeyConstraint = 'FOREIGN_KEY_CONSTRAINT',
  RecordNotFound = 'RECORD_NOT_FOUND',
  ValueTooLong = 'VALUE_TOO_LONG',
  Unexpected = 'UNEXPECTED_DATABASE_ERROR',
}

interface TraducaoDoErro {
  status: number;
  message: string;
  error: string;
  code: PrismaErrorCode;
}

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message, error, code } = this.translate(exception);

    // A mensagem devolvida é sempre genérica; o detalhe (com nomes de coluna e
    // constraint) fica só no log do servidor.
    this.logger.error(
      `${exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : 'VALIDATION'}: ${exception.message.replace(/\n/g, ' ')}`,
    );

    response.status(status).json({ message, error, statusCode: status, code });
  }

  private translate(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
  ): TraducaoDoErro {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Requisição inválida.',
        error: 'Bad Request',
        // O client do Prisma recusou a consulta antes de ela chegar ao banco.
        // Na prática é quase sempre client desatualizado em relação ao schema:
        // quem recebe este código deve rodar `npx prisma generate` e reiniciar,
        // não mexer no corpo da requisição.
        code: PrismaErrorCode.PrismaValidation,
      };
    }

    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Já existe um registro com os dados informados.',
          error: 'Conflict',
          code: PrismaErrorCode.UniqueConstraint,
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'O registro está vinculado a outros dados e não pode ser removido.',
          error: 'Conflict',
          code: PrismaErrorCode.ForeignKeyConstraint,
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Registro não encontrado.',
          error: 'Not Found',
          code: PrismaErrorCode.RecordNotFound,
        };
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Um dos valores informados excede o tamanho permitido.',
          error: 'Bad Request',
          code: PrismaErrorCode.ValueTooLong,
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro interno no servidor.',
          error: 'Internal Server Error',
          code: PrismaErrorCode.Unexpected,
        };
    }
  }
}
