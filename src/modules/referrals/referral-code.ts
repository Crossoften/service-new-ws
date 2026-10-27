import { randomBytes } from 'crypto';

/**
 * Código de indicação do influencer, isolado da classe porque dois caminhos
 * precisam da mesma regra: o cadastro, que gera o código na criação da conta, e
 * a leitura das indicações, que gera sob demanda para quem ficou sem.
 *
 * Duplicar a regra faria os dois caminhos divergirem em silêncio — o código
 * aparece em link compartilhado, então formato diferente é link que não casa.
 *
 * Formato: primeiro nome normalizado + 16 hexadecimais. O sufixo aleatório é
 * largo de propósito: a coluna é `@unique`, e colisão aqui viraria P2002 na
 * cara do usuário. Com 8 bytes, não acontece.
 */
export function buildReferralCode(name: string): string {
  const primeiroNome = name
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return `${primeiroNome}-${randomBytes(8).toString('hex')}`;
}
