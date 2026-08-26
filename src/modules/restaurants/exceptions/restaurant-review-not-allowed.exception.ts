import { ForbiddenException } from '@nestjs/common';

/**
 * Só avalia quem pediu.
 *
 * Segue a mesma regra dos outros quatro tipos de avaliação do projeto, que
 * exigem um trabalho concluído antes de liberar a nota. Sem isso, qualquer
 * conta poderia despejar notas em qualquer restaurante.
 */
export class RestaurantReviewNotAllowedException extends ForbiddenException {
  constructor() {
    super('É necessário ter um pedido entregue neste restaurante para avaliá-lo.');
  }
}
