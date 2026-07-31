import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRestaurantDto {
  @ApiPropertyOptional({ description: 'Nome do restaurante.' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

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

  @ApiPropertyOptional({ description: 'Id da categoria do restaurante.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria deve ser um número inteiro.' })
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Define se o restaurante está aberto para pedidos.' })
  @IsOptional()
  @IsBoolean({ message: 'O campo isOpen deve ser um booleano.' })
  isOpen?: boolean;

  @ApiPropertyOptional({ description: 'Define se o restaurante está ativo na plataforma.' })
  @IsOptional()
  @IsBoolean({ message: 'O campo isActive deve ser um booleano.' })
  isActive?: boolean;
}
