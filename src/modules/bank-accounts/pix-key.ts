import { PixKeyTypeEnum } from '@prisma/client';
import { normalizePhoneBR } from '@utils/normalizePhone';

/**
 * Normalização da chave Pix, isolada para poder ser testada sem banco.
 *
 * A chave é gravada já no formato em que o banco a espera. Guardar o que o
 * usuário digitou — `123.456.789-00`, `(34) 99870-1109` — obrigaria a limpar a
 * máscara na hora de pagar, e é exatamente aí que um erro custa dinheiro indo
 * para a pessoa errada.
 *
 * A validação é de **formato**, não de existência: só o banco sabe se a chave
 * está registrada de verdade. O que dá para impedir aqui é CPF com 10 dígitos e
 * e-mail sem arroba.
 */

/** `null` quando a chave não serve para o tipo informado. */
export function normalizePixKey(type: PixKeyTypeEnum, key: string): string | null {
  const bruta = key.trim();

  if (!bruta) return null;

  switch (type) {
    case PixKeyTypeEnum.Cpf: {
      const digitos = bruta.replace(/\D/g, '');

      return digitos.length === 11 ? digitos : null;
    }

    case PixKeyTypeEnum.Cnpj: {
      const digitos = bruta.replace(/\D/g, '');

      return digitos.length === 14 ? digitos : null;
    }

    case PixKeyTypeEnum.Email: {
      const minuscula = bruta.toLowerCase();

      // O Pix aceita e-mail de até 77 caracteres. A checagem é deliberadamente
      // frouxa — validar e-mail por regex estrita recusa endereço legítimo, e
      // quem confirma de verdade é o banco no momento da transferência.
      return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(minuscula) && minuscula.length <= 77
        ? minuscula
        : null;
    }

    case PixKeyTypeEnum.Phone:
      // Mesma normalização do SMS e do WhatsApp: o E.164 é o formato que o Pix
      // também exige, então não há uma segunda regra para manter em dia.
      return normalizePhoneBR(bruta);

    case PixKeyTypeEnum.Random:
      // Chave aleatória (EVP) é um UUID. O banco gera; aqui só se confere o
      // desenho, em minúsculas para a comparação ser estável.
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bruta)
        ? bruta.toLowerCase()
        : null;

    default:
      return null;
  }
}
