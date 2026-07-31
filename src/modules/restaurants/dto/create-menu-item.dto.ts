import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty({ description: 'Nome do item de cardápio.', example: 'X-Salada' })
  @IsString({ message: 'O nome deve ser um texto.' })
  name: string;

  @ApiPropertyOptional({ description: 'Descrição do item de cardápio.' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiProperty({ description: 'Preço do item de cardápio.', example: 25.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço deve ser um número válido.' })
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'URL da imagem do item.' })
  @IsOptional()
  @IsString({ message: 'A URL da imagem deve ser um texto.' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Chave da imagem do item no storage.' })
  @IsOptional()
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  imageKey?: string;

  @ApiProperty({ description: 'Id da categoria do cardápio à qual o item pertence.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria do cardápio deve ser um número inteiro.' })
  @Min(1)
  menuCategoryId: number;
}
