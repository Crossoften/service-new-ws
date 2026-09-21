import { ConflictException } from '@nestjs/common';

/**
 * O saldo mudou entre a tela e o envio.
 *
 * O admin faz o Pix olhando um número e só depois registra aqui. Se uma entrega
 * foi concluída nesse intervalo, o saldo subiu e liquidar tudo daria baixa em
 * dinheiro que não foi pago. Por isso o `expectedAmount` existe: quando vem
 * preenchido e não bate, nada é liquidado e a tela recarrega.
 */
export class DeliveryPayoutAmountChangedException extends ConflictException {
  constructor(atual: string) {
    super(
      `O saldo em aberto mudou desde que a tela foi carregada e agora é R$ ${atual}. ` +
        'Confira o valor e envie novamente.',
    );
  }
}
