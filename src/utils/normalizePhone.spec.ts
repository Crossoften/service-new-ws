import { normalizePhoneBR, phoneLookupVariants } from './normalizePhone';

describe('normalizePhoneBR', () => {
  it('normaliza o formato nacional móvel', () => {
    expect(normalizePhoneBR('11955554444')).toBe('+5511955554444');
  });

  it('normaliza o formato nacional fixo', () => {
    expect(normalizePhoneBR('1133334444')).toBe('+551133334444');
  });

  it('remove a máscara que o front envia', () => {
    expect(normalizePhoneBR('(11) 95555-4444')).toBe('+5511955554444');
    expect(normalizePhoneBR('+55 11 95555-4444')).toBe('+5511955554444');
  });

  it('aceita o código do país sem o sinal de mais', () => {
    expect(normalizePhoneBR('5511955554444')).toBe('+5511955554444');
  });

  it('é idempotente sobre um número já normalizado', () => {
    expect(normalizePhoneBR('+5511955554444')).toBe('+5511955554444');
  });

  it('preserva o país de um número internacional', () => {
    expect(normalizePhoneBR('+1 415 555 2671')).toBe('+14155552671');
  });

  it('rejeita o que não é telefone', () => {
    expect(normalizePhoneBR('')).toBeNull();
    expect(normalizePhoneBR(null)).toBeNull();
    expect(normalizePhoneBR('abc')).toBeNull();
    expect(normalizePhoneBR('12345')).toBeNull();
  });

  // Regressão: era este o caso que devolvia "SMS enviado com sucesso" sem
  // enviar nada — o usuário estava salvo em formato nacional e o front pedia
  // a recuperação em E.164.
  it('faz formatos diferentes do mesmo número convergirem', () => {
    const formatos = ['11955554444', '(11) 95555-4444', '5511955554444', '+55 11 95555-4444'];
    const normalizados = new Set(formatos.map(normalizePhoneBR));

    expect(normalizados.size).toBe(1);
    expect([...normalizados][0]).toBe('+5511955554444');
  });
});

describe('phoneLookupVariants', () => {
  it('cobre as três escritas que podem existir na base', () => {
    const variantes = phoneLookupVariants('+5511955554444');

    expect(variantes).toEqual(
      expect.arrayContaining(['+5511955554444', '5511955554444', '11955554444']),
    );
  });

  it('encontra o registro legado a partir da entrada normalizada', () => {
    expect(phoneLookupVariants('+5511955554444')).toContain('11955554444');
  });

  it('encontra o registro normalizado a partir da entrada nacional', () => {
    expect(phoneLookupVariants('11955554444')).toContain('+5511955554444');
  });

  it('mantém a entrada original, para máscaras gravadas literalmente', () => {
    expect(phoneLookupVariants('(11) 95555-4444')).toContain('(11) 95555-4444');
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(phoneLookupVariants('')).toEqual([]);
    expect(phoneLookupVariants(null)).toEqual([]);
  });
});
