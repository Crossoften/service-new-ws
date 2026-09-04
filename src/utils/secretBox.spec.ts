import { decryptSecret, encryptSecret, isEncrypted, SecretBoxKeyError } from './secretBox';

const CHAVE = 'a'.repeat(64);
const OUTRA_CHAVE = 'b'.repeat(64);

describe('secretBox', () => {
  it('devolve o texto original depois de cifrar e decifrar', () => {
    const segredo = 'APP_USR-1234567890-abcdef';
    expect(decryptSecret(encryptSecret(segredo, CHAVE), CHAVE)).toBe(segredo);
  });

  it('não guarda o texto original no valor cifrado', () => {
    const segredo = 'APP_USR-token-do-vendedor';
    expect(encryptSecret(segredo, CHAVE)).not.toContain(segredo);
  });

  it('gera saídas diferentes para o mesmo texto', () => {
    // IV aleatório: dois vendedores com o mesmo token não podem ficar com o
    // mesmo valor no banco, senão a igualdade vaza informação.
    const a = encryptSecret('mesmo-token', CHAVE);
    const b = encryptSecret('mesmo-token', CHAVE);

    expect(a).not.toBe(b);
    expect(decryptSecret(a, CHAVE)).toBe(decryptSecret(b, CHAVE));
  });

  it('recusa decifrar com a chave errada', () => {
    const cifrado = encryptSecret('segredo', CHAVE);
    expect(() => decryptSecret(cifrado, OUTRA_CHAVE)).toThrow();
  });

  it('recusa decifrar conteúdo adulterado', () => {
    const cifrado = encryptSecret('segredo', CHAVE);
    const adulterado = cifrado.slice(0, -2) + (cifrado.endsWith('00') ? '11' : '00');

    expect(() => decryptSecret(adulterado, CHAVE)).toThrow();
  });

  it('exige chave de 64 caracteres hexadecimais', () => {
    expect(() => encryptSecret('x', undefined)).toThrow(SecretBoxKeyError);
    expect(() => encryptSecret('x', 'curta')).toThrow(SecretBoxKeyError);
    expect(() => encryptSecret('x', 'z'.repeat(64))).toThrow(SecretBoxKeyError);
  });

  it('reconhece valor já cifrado', () => {
    expect(isEncrypted(encryptSecret('segredo', CHAVE))).toBe(true);
    expect(isEncrypted('APP_USR-token-cru')).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });

  it('preserva acentuação e caracteres especiais', () => {
    const segredo = 'ção-ãé£€-token/+=';
    expect(decryptSecret(encryptSecret(segredo, CHAVE), CHAVE)).toBe(segredo);
  });
});
