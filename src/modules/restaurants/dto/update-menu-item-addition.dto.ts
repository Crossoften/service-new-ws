import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMenuItemAdditionDto {
  @ApiPropertyOptional({ description: 'Nome do adicional.' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Preço do adicional.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço deve ser um número válido.' })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Define se o adicional está disponível.' })
  @IsOptional()
  @IsBoolean({ message: 'O campo isActive deve ser um booleano.' })
  isActive?: boolean;
}
