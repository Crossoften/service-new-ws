import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFoodOrderItemDto {
  @ApiProperty({ description: 'Id do item de cardápio.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id do item de cardápio deve ser um número inteiro.' })
  @Min(1)
  menuItemId: number;

  @ApiProperty({ description: 'Quantidade do item.', example: 2 })
  @Type(() => Number)
  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Observações do item.', example: 'Sem cebola.' })
  @IsOptional()
  @IsString({ message: 'As observações devem ser um texto.' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Ids dos adicionais selecionados.', type: [Number] })
  @IsOptional()
  @IsArray({ message: 'Os adicionais devem ser uma lista.' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Os ids dos adicionais devem ser números inteiros.' })
  additionIds?: number[];
}
