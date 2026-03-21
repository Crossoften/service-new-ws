import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionIntervalEnum } from '../../enums/subscription-interval.enum';

export class ResponsePlanDto {
  @ApiProperty({ description: 'Identificador do plano.', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome de exibição do plano.', example: 'Plano mensal' })
  name: string;

  @ApiProperty({ description: 'Slug único do plano.', example: 'plano-mensal' })
  slug: string;

  @ApiPropertyOptional({
    description: 'Descrição resumida do plano.',
    example: 'Acesso completo ao app por 1 mês.',
  })
  description?: string;

  @ApiProperty({ description: 'Preço do plano.', example: '39.90' })
  price: string;

  @ApiProperty({
    description: 'Intervalo de renovação do plano.',
    enum: SubscriptionIntervalEnum,
    example: SubscriptionIntervalEnum.Month,
  })
  interval: SubscriptionIntervalEnum;

  @ApiProperty({ description: 'Quantidade de intervalos por ciclo.', example: 1 })
  intervalCount: number;

  @ApiProperty({
    description: 'Benefícios incluídos no plano.',
    type: [String],
    example: ['Benefício 1', 'Benefício 2'],
  })
  benefits: string[];

  @ApiProperty({ description: 'Indica se o plano está ativo.', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Ordem de exibição do plano.', example: 1 })
  sortOrder: number;

  @ApiProperty({ description: 'Data de criação do plano.', example: '2026-03-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do plano.',
    example: '2026-03-20T12:00:00.000Z',
  })
  updatedAt: Date;
}

export class ResponseFindAllPlansDto {
  @ApiProperty({ description: 'Lista de planos retornados.', type: [ResponsePlanDto] })
  plans: ResponsePlanDto[];

  @ApiProperty({ description: 'Página atual.', example: 1 })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 1 })
  totalPages: number;

  @ApiProperty({ description: 'Total de registros encontrados.', example: 3 })
  totalRecords: number;
}
