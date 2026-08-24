import { randomInt } from 'crypto';

const CODE_LENGTH = 6;

/**
 * Gera o código numérico de verificação enviado ao usuário por e-mail ou SMS.
 *
 * Usa `crypto.randomInt` (CSPRNG) em vez de `Math.random`, e permite dígitos
 * repetidos: a versão anterior gerava 4 dígitos distintos entre si, o que
 * reduzia o espaço de busca a 5.040 combinações — exaurível por força bruta.
 * Com 6 dígitos e repetição permitida são 1.000.000 de combinações.
 */
export default function generateCode(): string {
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i++) {
    code += randomInt(0, 10).toString();
  }

  return code;
}

export { CODE_LENGTH };
