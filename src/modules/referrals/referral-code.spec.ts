import { buildReferralCode } from './referral-code';

describe('buildReferralCode', () => {
  it('usa o primeiro nome, em minúsculas, com sufixo hexadecimal', () => {
    expect(buildReferralCode('Maria Silva')).toMatch(/^maria-[0-9a-f]{16}$/);
  });

  it('ignora o sobrenome', () => {
    expect(buildReferralCode('Maria Silva Souza').startsWith('maria-')).toBe(true);
  });

  it('remove acento do primeiro nome', () => {
    // O código vai para dentro de link e de QR code: acento ali é fonte de
    // link quebrado dependendo de quem codifica a URL.
    expect(buildReferralCode('José Antônio')).toMatch(/^jose-[0-9a-f]{16}$/);
  });

  it('descarta pontuação e espaço extra', () => {
    expect(buildReferralCode("  O'Brien  Costa ")).toMatch(/^obrien-[0-9a-f]{16}$/);
  });

  it('tolera nome só com símbolos, sem gerar código vazio quebrado', () => {
    // Resta o separador e o hash — ainda é um código válido e único, em vez de
    // exceção na criação da conta.
    expect(buildReferralCode('###')).toMatch(/^-[0-9a-f]{16}$/);
  });

  it('não repete entre chamadas para o mesmo nome', () => {
    // A coluna é `@unique`: código igual para dois influencers com o mesmo
    // primeiro nome viraria P2002 na cara do usuário.
    const codigos = new Set(Array.from({ length: 50 }, () => buildReferralCode('Maria')));

    expect(codigos.size).toBe(50);
  });
});
