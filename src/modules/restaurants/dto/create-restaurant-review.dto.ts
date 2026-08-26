import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateRestaurantReviewDto {
  @ApiProperty({
    description: 'Nota de 1 a 5 estrelas.',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @Type(() => Number)
  @IsInt({ message: 'A nota deve ser um número inteiro.' })
  @Min(1, { message: 'A nota mínima é 1.' })
  @Max(5, { message: 'A nota máxima é 5.' })
  rating: number;

  @ApiPropertyOptional({
    description: 'Comentário sobre o restaurante.',
    example: 'Comida ótima e entrega rápida.',
  })
  @IsOptional()
  @IsString({ message: 'O comentário deve ser um texto.' })
  @MaxLength(2000, { message: 'O comentário deve ter no máximo 2000 caracteres.' })
  comment?: string;
}
