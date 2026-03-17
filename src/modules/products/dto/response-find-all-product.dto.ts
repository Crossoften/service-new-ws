import { ApiProperty } from '@nestjs/swagger';
import { ResponseProductListItemDto } from './response-product.dto';

export class ResponseFindAllProductDto {
  @ApiProperty({
    description: 'Lista de produtos retornados na consulta.',
    type: [ResponseProductListItemDto],
  })
  products: ResponseProductListItemDto[];

  @ApiProperty({ description: 'Página atual da consulta.', example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3, type: Number })
  totalPages: number;

  @ApiProperty({ description: 'Total de registros encontrados.', example: 24, type: Number })
  totalRecords: number;
}
