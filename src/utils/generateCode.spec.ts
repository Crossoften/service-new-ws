import generateCode, { CODE_LENGTH } from './generateCode';

describe('generateCode', () => {
  it('gera exatamente 6 dígitos numéricos', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it('expõe o comprimento usado pelos DTOs', () => {
    expect(CODE_LENGTH).toBe(6);
  });

  it('permite dígitos repetidos', () => {
    // A versão antiga gerava 4 dígitos DISTINTOS entre si, reduzindo o espaço
    // de busca a 5.040 combinações. Se nenhum código em 500 tiver repetição,
    // a restrição voltou.
    const comRepeticao = Array.from({ length: 500 }, generateCode).some(
      (code) => new Set(code).size < code.length,
    );

    expect(comRepeticao).toBe(true);
  });

  it('cobre uma faixa ampla do espaço possível', () => {
    const amostras = new Set(Array.from({ length: 500 }, generateCode));

    // Com 1.000.000 de combinações, 500 sorteios praticamente não colidem.
    expect(amostras.size).toBeGreaterThan(490);
  });
});
