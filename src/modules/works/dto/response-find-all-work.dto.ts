import { ApiProperty } from '@nestjs/swagger';
import { ResponseWorkListItemDto } from './response-work.dto';

export class ResponseFindAllWorkDto {
  @ApiProperty({
    description: 'Lista de trabalhos retornados na consulta paginada.',
    type: [ResponseWorkListItemDto],
  })
  works: ResponseWorkListItemDto[];

  @ApiProperty({
    description: 'Número da página atual da consulta paginada.',
    example: 1,
    type: Number,
  })
  currentPage: number;

  @ApiProperty({
    description:
      'Quantidade total de páginas disponíveis com base no total de registros e no limite informado.',
    example: 3,
    type: Number,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Quantidade total de registros encontrados para os filtros aplicados.',
    example: 24,
    type: Number,
  })
  totalRecords: number;
}
