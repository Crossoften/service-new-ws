import { ApiProperty } from '@nestjs/swagger';
import { ResponseBudgetListItemDto } from './response-budget.dto';

export class ResponseFindAllBudgetDto {
  @ApiProperty({
    description: 'Lista de orçamentos retornados na consulta.',
    type: [ResponseBudgetListItemDto],
  })
  budgets: ResponseBudgetListItemDto[];

  @ApiProperty({ description: 'Página atual da consulta.', example: 1 })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3 })
  totalPages: number;

  @ApiProperty({ description: 'Total de registros encontrados.', example: 24 })
  totalRecords: number;
}
