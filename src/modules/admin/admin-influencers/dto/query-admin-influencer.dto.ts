import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAdminInfluencerDto {
  @ApiProperty({
    description: 'Busca por nome, email ou telefone.',
    required: false,
    example: 'João',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtro pelo status.',
    enum: Status,
    enumName: 'Status',
    required: false,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({ description: 'Quantidade de registros por página.', required: false, example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  take?: number;

  @ApiProperty({ description: 'Página atual.', required: false, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  skip?: number;

  @ApiProperty({
    description: 'Campo para ordenação dos resultados.',
    required: false,
    example: 'createdAt',
    enum: ['name', 'email', 'status', 'createdAt'],
  })
  @IsIn(['name', 'email', 'status', 'createdAt'])
  @IsOptional()
  sortBy?: string;

  @ApiProperty({
    description: 'Direção da ordenação.',
    required: false,
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDirection?: 'asc' | 'desc';
}
