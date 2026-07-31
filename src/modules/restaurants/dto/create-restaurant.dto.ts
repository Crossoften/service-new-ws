import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ description: 'Nome do restaurante.', example: 'Cantina da Praça' })
  @IsString({ message: 'O nome deve ser um texto.' })
  name: string;

  @ApiPropertyOptional({ description: 'Descrição do restaurante.' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({ description: 'URL da imagem do restaurante.' })
  @IsOptional()
  @IsString({ message: 'A URL da imagem deve ser um texto.' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Chave da imagem do restaurante no storage.' })
  @IsOptional()
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  imageKey?: string;

  @ApiProperty({ description: 'Id da categoria do restaurante.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria deve ser um número inteiro.' })
  @Min(1)
  categoryId: number;
}
