import { ForbiddenException } from '@nestjs/common';

/**
 * O fornecedor precisa assinar para executar a operação.
 *
 * Carrega `categoryId` quando o bloqueio é de uma categoria específica: sem
 * isso o front só consegue dizer "assine", e o fornecedor com três categorias
 * — uma vencida, duas em dia — não descobre qual delas precisa pagar. Com o
 * id, a tela leva direto ao checkout daquela categoria.
 */
export class SupplierSubscriptionRequiredException extends ForbiddenException {
  constructor(categoryId?: number) {
    super({
      message: categoryId
        ? 'É necessário ter uma assinatura ativa desta categoria para realizar esta operação.'
        : 'É necessário ter uma assinatura ativa para realizar esta operação.',
      error: 'Forbidden',
      statusCode: 403,
      categoryId: categoryId ?? null,
    });
  }
}
