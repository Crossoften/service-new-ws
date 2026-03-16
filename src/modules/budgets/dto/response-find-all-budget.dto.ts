import { ApiProperty } from '@nestjs/swagger';
import { ResponseBudgetDto } from './response-budget.dto';

export class ResponseFindAllBudgetDto {
  @ApiProperty({
    description: 'Lista de orçamentos retornados na consulta.',
    type: [ResponseBudgetDto],
  })
  budgets: ResponseBudgetDto[];

  @ApiProperty({ description: 'Página atual da consulta.', example: 1 })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3 })
  totalPages: number;

  @ApiProperty({ description: 'Total de registros encontrados.', example: 24 })
  totalRecords: number;
}
