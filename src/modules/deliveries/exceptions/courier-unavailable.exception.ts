import { ConflictException } from '@nestjs/common';

/**
 * Entregador tentou aceitar corrida estando indisponível.
 *
 * 409 e não 403: não é falta de permissão — é um estado que ele mesmo escolheu
 * e pode desfazer no próprio aplicativo. A mensagem diz o caminho.
 */
export class CourierUnavailableException extends ConflictException {
  constructor() {
    super('Você está indisponível. Ative sua disponibilidade para aceitar corridas.');
  }
}
