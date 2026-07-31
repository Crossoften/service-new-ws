import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMenuItemAdditionDto {
  @ApiProperty({ description: 'Nome do adicional.', example: 'Bacon extra' })
  @IsString({ message: 'O nome deve ser um texto.' })
  name: string;

  @ApiPropertyOptional({ description: 'Preço do adicional.', example: 5.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço deve ser um número válido.' })
  @Min(0)
  price?: number;
}
