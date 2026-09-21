import { ConflictException } from '@nestjs/common';

/**
 * Orçamento aprovado é imutável.
 *
 * No aceite, o `responseValue` é copiado para `Work.serviceValue` e
 * `Work.totalValue`, e é dali que o pagamento tira o valor cobrado
 * (`works.service.ts`, `work.totalValue || work.serviceValue`). Continuar
 * editando o orçamento depois disso fazia o número exibido ao cliente divergir
 * do que foi contratado e do que foi pago, sem nada reconciliar os dois — e a
 * edição valia inclusive depois do pagamento aprovado.
 *
 * 409 e não 400: o pedido está bem formado; o que impede é o estado do recurso.
 */
export class BudgetLockedAfterApprovalException extends ConflictException {
  constructor() {
    super(
      'Este orçamento já foi aprovado e virou um trabalho, por isso não pode mais ser alterado. ' +
        'Ajustes de valor depois do aceite são feitos pelo pedido de adicional no trabalho.',
    );
  }
}
