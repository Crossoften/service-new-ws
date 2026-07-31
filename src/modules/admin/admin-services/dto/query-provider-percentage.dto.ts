import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

enum SortDirectionEnum {
  ASC = 'asc',
  DESC = 'desc',
}

enum SortByProviderPercentageEnum {
  NAME = 'name',
  PLATFORM_FEE_RATE = 'platformFeeRate',
  SORT_ORDER = 'sortOrder',
}

export class QueryProviderPercentageDto {
  @ApiPropertyOptional({ description: 'Filtrar por nome da categoria', example: 'Limpeza' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    enum: SortByProviderPercentageEnum,
    default: SortByProviderPercentageEnum.NAME,
  })
  @IsOptional()
  @IsEnum(SortByProviderPercentageEnum)
  sortBy?: SortByProviderPercentageEnum = SortByProviderPercentageEnum.NAME;

  @ApiPropertyOptional({ enum: SortDirectionEnum, default: SortDirectionEnum.ASC })
  @IsOptional()
  @IsEnum(SortDirectionEnum)
  sortDirection?: SortDirectionEnum = SortDirectionEnum.ASC;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  skip?: number;
}
