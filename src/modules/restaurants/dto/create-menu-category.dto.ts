import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMenuCategoryDto {
  @ApiProperty({ description: 'Nome da categoria do cardápio.', example: 'Entradas' })
  @IsString({ message: 'O nome deve ser um texto.' })
  name: string;

  @ApiPropertyOptional({ description: 'Ordem de exibição da categoria.', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O campo sortOrder deve ser um número inteiro.' })
  @Min(0)
  sortOrder?: number;
}
