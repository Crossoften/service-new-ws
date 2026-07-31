import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ description: 'Nome do item de cardápio.' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição do item de cardápio.' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({ description: 'Preço do item de cardápio.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço deve ser um número válido.' })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'URL da imagem do item.' })
  @IsOptional()
  @IsString({ message: 'A URL da imagem deve ser um texto.' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Chave da imagem do item no storage.' })
  @IsOptional()
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  imageKey?: string;

  @ApiPropertyOptional({ description: 'Id da categoria do cardápio à qual o item pertence.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria do cardápio deve ser um número inteiro.' })
  @Min(1)
  menuCategoryId?: number;

  @ApiPropertyOptional({ description: 'Define se o item está disponível no cardápio.' })
  @IsOptional()
  @IsBoolean({ message: 'O campo isActive deve ser um booleano.' })
  isActive?: boolean;
}
