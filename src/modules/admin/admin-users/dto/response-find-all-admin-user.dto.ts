import { ApiProperty } from '@nestjs/swagger';
import { ResponseAdminUserListDto } from './response-admin-user.dto';

export class ResponseFindAllAdminUserDto {
  @ApiProperty({
    description: 'Lista paginada de usuários retornados pela consulta.',
    type: [ResponseAdminUserListDto],
  })
  users: ResponseAdminUserListDto[];

  @ApiProperty({
    description: 'Número da página atual da consulta.',
    example: 1,
    type: Number,
  })
  currentPage: number;

  @ApiProperty({
    description: 'Quantidade total de páginas disponíveis.',
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
