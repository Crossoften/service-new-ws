import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { FoodOrderStatusEnum } from '@prisma/client';

export class QueryFoodOrderDto {
  @ApiPropertyOptional({ description: 'Filtro por status do pedido.', enum: FoodOrderStatusEnum })
  @IsOptional()
  @IsEnum(FoodOrderStatusEnum, { message: 'O status do pedido é inválido.' })
  status?: FoodOrderStatusEnum;

  @ApiPropertyOptional({ description: 'Quantidade de registros por página.', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O campo take deve ser um número inteiro.' })
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ description: 'Página atual da listagem.', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O campo skip deve ser um número inteiro.' })
  @Min(1)
  skip?: number;
}
