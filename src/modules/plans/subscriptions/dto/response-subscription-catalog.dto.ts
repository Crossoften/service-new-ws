import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ResponsePlanDto } from '../../plans/dto/response-plan.dto';

/**
 * Assinatura vista de dentro do catálogo: só o que a tela de contratação
 * precisa para decidir entre "assinar", "renovar" e "já é sua".
 *
 * É um recorte do `ResponseSubscriptionDto`, e não ele inteiro, porque o
 * catálogo lista todas as categorias — carregar plano, endereço e pagamento de
 * cada uma encheria a resposta de dado que a tela não usa.
 */
export class ResponseCatalogSubscriptionDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Plano anual' })
  planName: string;

  @ApiPropertyOptional({ example: '2027-03-20T12:00:00.000Z' })
  currentPeriodEnd?: Date;

  @ApiPropertyOptional({ example: 5, type: Number, nullable: true })
  daysUntilExpiration?: number | null;

  @ApiProperty({ example: false })
  needsRenewal: boolean;

  @ApiProperty({ example: false })
  inGracePeriod: boolean;

  @ApiProperty({ example: false })
  expired: boolean;

  @ApiProperty({ example: false })
  cancelAtPeriodEnd: boolean;

  @ApiProperty({
    description:
      'Assinatura de cobertura ampla — hoje só as concessões administrativas. ' +
      'Vale para todas as categorias, então a tela não deve oferecer cancelá-la ' +
      'a partir de uma categoria específica.',
    example: false,
  })
  coversAllCategories: boolean;
}

export class ResponseCatalogCategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Pintor' })
  name: string;

  @ApiProperty({ example: 'pintor' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://cdn.exemplo.com/pintor.png' })
  iconUrl?: string;

  @ApiProperty({
    description:
      'O fornecedor pode operar nesta categoria agora. Responde exatamente o ' +
      'que o portão responderia — inclui a tolerância de 3 dias e a cobertura ' +
      'ampla das concessões.',
    example: true,
  })
  isSubscribed: boolean;

  @ApiPropertyOptional({
    description: 'A assinatura que cobre esta categoria, quando existe.',
    type: ResponseCatalogSubscriptionDto,
  })
  subscription?: ResponseCatalogSubscriptionDto;
}

/**
 * Tudo que a tela de contratação precisa, numa chamada.
 *
 * Existe para o front não ter que cruzar duas listas por conta própria. O
 * cruzamento aqui usa o mesmo predicado do portão: se a tela dissesse
 * "assinado" e a API recusasse a operação, o fornecedor não teria como
 * entender o que aconteceu.
 */
export class ResponseSubscriptionCatalogDto {
  @ApiProperty({
    description: 'Planos ativos, com o valor do ciclo e o equivalente mensal.',
    type: [ResponsePlanDto],
  })
  plans: ResponsePlanDto[];

  @ApiProperty({
    description: 'Categorias de atuação ativas, com a situação do fornecedor em cada uma.',
    type: [ResponseCatalogCategoryDto],
  })
  categories: ResponseCatalogCategoryDto[];

  @ApiProperty({
    description: 'Quantas categorias o fornecedor pode operar agora.',
    example: 2,
  })
  subscribedCount: number;
}
