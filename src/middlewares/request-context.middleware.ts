import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Correlaciona as linhas de log de uma mesma requisição.
 *
 * Aceita um `x-request-id` vindo do proxy (para amarrar o rastro ponta a ponta)
 * e gera um quando não vier. O id volta no header da resposta, então um erro
 * relatado pelo usuário pode ser localizado no log sem depender de horário.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const startedAt = Date.now();

    res.on('finish', () => {
      const elapsed = Date.now() - startedAt;
      const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${elapsed}ms [${requestId}]`;

      if (res.statusCode >= 500) {
        this.logger.error(line);
      } else if (res.statusCode >= 400) {
        this.logger.warn(line);
      } else {
        this.logger.log(line);
      }
    });

    next();
  }
}
