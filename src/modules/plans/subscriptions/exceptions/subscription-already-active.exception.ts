import { BadRequestException } from '@nestjs/common';

/**
 * Já existe assinatura vigente cobrindo o que se tentou assinar.
 *
 * Com a cobrança por categoria, o conflito deixou de ser "uma por usuário" e
 * passou a ser "uma por categoria". A mensagem nomeia a categoria porque o
 * fornecedor pode ter várias e, sem isso, não saberia qual delas já está paga.
 */
export class SubscriptionAlreadyActiveException extends BadRequestException {
  constructor(categoryName?: string) {
    super(
      categoryName
        ? `O usuário já possui uma assinatura ativa para a categoria ${categoryName}.`
        : 'O usuário já possui uma assinatura ativa.',
    );
  }
}
