import { ForbiddenException } from '@nestjs/common';

/**
 * A autorização de envio não confere.
 *
 * Token inválido, chave de outro usuário, envio pela rota local com S3 ligado
 * ou arquivo acima do teto. A mensagem é a mesma nos quatro casos de propósito:
 * dizer qual deles falhou ajudaria quem está tentando adivinhar um token.
 */
export class UploadNotAuthorizedException extends ForbiddenException {
  constructor() {
    super('Autorização de envio inválida ou expirada. Solicite uma nova.');
  }
}
