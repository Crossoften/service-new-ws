import { ApiProperty } from '@nestjs/swagger';
import { ServiceTypeEnum } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAdminServiceDto {
  @ApiProperty({
    description: 'Busca por nome do serviço.',
    required: false,
    example: 'Hidráulico',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Filtro pelo id da categoria.', required: false, example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({
    description: 'Filtro pelo tipo do serviço.',
    enum: ServiceTypeEnum,
    enumName: 'ServiceTypeEnum',
    required: false,
  })
  @IsEnum(ServiceTypeEnum)
  @IsOptional()
  type?: ServiceTypeEnum;

  @ApiProperty({ description: 'Filtro pelo status ativo/inativo.', required: false, example: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

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
}
