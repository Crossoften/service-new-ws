import { ApiProperty } from '@nestjs/swagger';
import { ResponseServiceListItemDto } from './response-service.dto';

export class ResponseFindAllServiceDto {
  @ApiProperty({
    description: 'Lista de serviços retornados na consulta.',
    type: [ResponseServiceListItemDto],
  })
  services: ResponseServiceListItemDto[];

  @ApiProperty({ description: 'Página atual da consulta.', example: 1 })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3 })
  totalPages: number;

  @ApiProperty({ description: 'Total de registros encontrados.', example: 24 })
  totalRecords: number;
}
