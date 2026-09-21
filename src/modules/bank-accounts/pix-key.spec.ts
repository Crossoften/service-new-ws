import { PixKeyTypeEnum } from '@prisma/client';

import { normalizePixKey } from './pix-key';

describe('normalizePixKey', () => {
  describe('CPF', () => {
    it('remove a máscara', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Cpf, '123.456.789-00')).toBe('12345678900');
    });

    it('aceita o que já vem limpo', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Cpf, '12345678900')).toBe('12345678900');
    });

    it('recusa comprimento errado', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Cpf, '1234567890')).toBeNull();
      expect(normalizePixKey(PixKeyTypeEnum.Cpf, '123456789012')).toBeNull();
    });
  });

  describe('CNPJ', () => {
    it('remove a máscara', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Cnpj, '12.345.678/0001-90')).toBe('12345678000190');
    });

    it('recusa CPF no lugar de CNPJ', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Cnpj, '12345678900')).toBeNull();
    });
  });

  describe('e-mail', () => {
    it('normaliza para minúsculas', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Email, '  Maria@Email.COM ')).toBe('maria@email.com');
    });

    it('recusa endereço sem arroba ou sem domínio', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Email, 'maria.email.com')).toBeNull();
      expect(normalizePixKey(PixKeyTypeEnum.Email, 'maria@email')).toBeNull();
    });

    it('recusa acima do limite de 77 caracteres do Pix', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Email, `${'a'.repeat(70)}@email.com`)).toBeNull();
    });
  });

  describe('telefone', () => {
    it('converge os formatos para E.164, como o SMS já faz', () => {
      const esperado = '+5534998701109';

      expect(normalizePixKey(PixKeyTypeEnum.Phone, '34998701109')).toBe(esperado);
      expect(normalizePixKey(PixKeyTypeEnum.Phone, '(34) 99870-1109')).toBe(esperado);
      expect(normalizePixKey(PixKeyTypeEnum.Phone, '+55 34 99870-1109')).toBe(esperado);
    });

    it('recusa número incompleto', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Phone, '99870')).toBeNull();
    });
  });

  describe('chave aleatória', () => {
    it('aceita o UUID do banco, em minúsculas', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Random, '9B5E2F1A-4C3D-4E7F-8A1B-2C3D4E5F6A7B')).toBe(
        '9b5e2f1a-4c3d-4e7f-8a1b-2c3d4e5f6a7b',
      );
    });

    it('recusa texto que não é UUID', () => {
      expect(normalizePixKey(PixKeyTypeEnum.Random, 'chave-aleatoria')).toBeNull();
    });
  });

  it('recusa chave em branco em qualquer tipo', () => {
    for (const tipo of Object.values(PixKeyTypeEnum)) {
      expect(normalizePixKey(tipo, '   ')).toBeNull();
    }
  });
});
