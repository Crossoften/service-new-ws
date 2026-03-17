import { ApiProperty } from '@nestjs/swagger';
import { ResponseTransportationListItemDto } from './response-transportation.dto';

export class ResponseFindAllTransportationDto {
  @ApiProperty({
    description: 'Lista de transportes retornados na consulta.',
    type: [ResponseTransportationListItemDto],
  })
  transportations: ResponseTransportationListItemDto[];

  @ApiProperty({ description: 'Página atual da consulta.', example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3, type: Number })
  totalPages: number;

  @ApiProperty({ description: 'Total de registros encontrados.', example: 24, type: Number })
  totalRecords: number;
}
