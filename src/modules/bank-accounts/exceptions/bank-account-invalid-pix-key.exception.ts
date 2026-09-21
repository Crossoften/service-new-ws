import { BadRequestException } from '@nestjs/common';

/**
 * Chave Pix incoerente com o tipo informado.
 *
 * `class-validator` valida campo a campo; a relação entre `pixKeyType` e
 * `pixKey` é entre dois campos e por isso mora no service — mesma razão pela
 * qual a coerência entre tipo e valor do cupom também vive lá.
 */
export class BankAccountInvalidPixKeyException extends BadRequestException {
  constructor(motivo: string) {
    super(motivo);
  }

  static tipoSemChave(): BankAccountInvalidPixKeyException {
    return new BankAccountInvalidPixKeyException(
      'Informe a chave Pix junto do tipo, ou nenhum dos dois.',
    );
  }

  static chaveSemTipo(): BankAccountInvalidPixKeyException {
    return new BankAccountInvalidPixKeyException(
      'Informe o tipo da chave Pix junto da chave, ou nenhum dos dois.',
    );
  }

  static formatoInvalido(): BankAccountInvalidPixKeyException {
    return new BankAccountInvalidPixKeyException(
      'A chave Pix não confere com o tipo informado. ' +
        'CPF tem 11 dígitos, CNPJ tem 14, telefone precisa de DDD, ' +
        'e a chave aleatória é o código que o banco gera.',
    );
  }
}
