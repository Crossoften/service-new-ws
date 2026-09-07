import { ConflictException } from '@nestjs/common';

/**
 * O fornecedor está com a assinatura vencida e não pode receber negócio novo.
 *
 * Diferente da `SupplierSubscriptionRequiredException`, que é `403` e fala com
 * o próprio fornecedor sobre a assinatura dele. Aqui quem recebe o erro é o
 * cliente, que não tem pendência nenhuma — `403` diria que ele não tem
 * permissão, o que é falso. `409` é o que descreve o caso: o pedido é legítimo,
 * o estado do outro lado é que não permite agora.
 */
export class ProviderNotSellingException extends ConflictException {
  constructor() {
    super(
      'Este fornecedor está temporariamente indisponível e não pode receber novos pedidos. ' +
        'Tente novamente mais tarde.',
    );
  }
}
