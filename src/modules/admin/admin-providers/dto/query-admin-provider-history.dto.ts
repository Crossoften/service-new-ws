import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class QueryAdminProviderHistoryDto {
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
    enum: ['createdAt', 'serviceDate', 'totalValue', 'status'],
  })
  @IsIn(['createdAt', 'serviceDate', 'totalValue', 'status'])
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
