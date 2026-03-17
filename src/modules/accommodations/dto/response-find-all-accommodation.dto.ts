import { ApiProperty } from '@nestjs/swagger';
import { ResponseAccommodationListItemDto } from './response-accommodation.dto';

export class ResponseFindAllAccommodationDto {
  @ApiProperty({
    description: 'Lista de hospedagens retornadas na consulta.',
    type: [ResponseAccommodationListItemDto],
  })
  accommodations: ResponseAccommodationListItemDto[];

  @ApiProperty({ description: 'Página atual da consulta.', example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3, type: Number })
  totalPages: number;

  @ApiProperty({ description: 'Total de registros encontrados.', example: 24, type: Number })
  totalRecords: number;
}
