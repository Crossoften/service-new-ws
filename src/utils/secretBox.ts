import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Cifragem simétrica para segredos guardados no banco.
 *
 * Nasceu para os tokens de OAuth do Mercado Pago, que autorizam movimentar
 * dinheiro em nome do vendedor. Guardá-los em texto puro transformaria um
 * vazamento de banco em acesso às contas financeiras dos prestadores — que é
 * diferente, em grau, de expor os outros dados da tabela.
 *
 * AES-256-GCM: além de cifrar, autentica. Se o texto cifrado for adulterado, a
 * decifragem falha em vez de devolver lixo silenciosamente.
 *
 * O formato guardado carrega a versão do esquema:
 *
 *     v1:<iv em hex>:<tag em hex>:<cifra em hex>
 *
 * O prefixo existe para permitir trocar algoritmo ou chave no futuro sem
 * precisar adivinhar como cada registro antigo foi cifrado.
 */

const VERSAO = 'v1';
const ALGORITMO = 'aes-256-gcm';
const TAMANHO_IV = 12; // recomendado para GCM
const TAMANHO_CHAVE = 32; // AES-256

export class SecretBoxKeyError extends Error {}

/**
 * Lê a chave a partir do valor bruto da variável de ambiente.
 *
 * Exige 64 caracteres hexadecimais — 32 bytes. Gere com:
 *
 *     openssl rand -hex 32
 */
function lerChave(chaveHex: string | undefined): Buffer {
  if (!chaveHex) {
    throw new SecretBoxKeyError(
      'Chave de cifragem ausente. Defina MERCADOPAGO_TOKEN_ENCRYPTION_KEY no .env ' +
        '(gere com: openssl rand -hex 32).',
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(chaveHex.trim())) {
    throw new SecretBoxKeyError(
      'Chave de cifragem inválida: são esperados 64 caracteres hexadecimais ' +
        '(32 bytes). Gere com: openssl rand -hex 32.',
    );
  }

  return Buffer.from(chaveHex.trim(), 'hex');
}

export function encryptSecret(texto: string, chaveHex: string | undefined): string {
  const chave = lerChave(chaveHex);

  if (chave.length !== TAMANHO_CHAVE) {
    throw new SecretBoxKeyError('Chave de cifragem com tamanho inesperado.');
  }

  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv(ALGORITMO, chave, iv);

  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSAO, iv.toString('hex'), tag.toString('hex'), cifrado.toString('hex')].join(':');
}

export function decryptSecret(guardado: string, chaveHex: string | undefined): string {
  const chave = lerChave(chaveHex);
  const partes = guardado.split(':');

  if (partes.length !== 4 || partes[0] !== VERSAO) {
    throw new SecretBoxKeyError('Segredo em formato desconhecido; não é possível decifrar.');
  }

  const [, ivHex, tagHex, cifraHex] = partes;

  const decipher = createDecipheriv(ALGORITMO, chave, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  return Buffer.concat([decipher.update(Buffer.from(cifraHex, 'hex')), decipher.final()]).toString(
    'utf8',
  );
}

/** Reconhece um valor já cifrado, para não cifrar duas vezes por engano. */
export function isEncrypted(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && valor.startsWith(`${VERSAO}:`);
}
