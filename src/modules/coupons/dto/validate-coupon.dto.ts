import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Código do cupom.', example: 'BEMVINDO10' })
  @IsString({ message: 'O código deve ser um texto.' })
  @MaxLength(40, { message: 'O código não pode ter mais que 40 caracteres.' })
  code: string;

  @ApiProperty({ description: 'Restaurante do pedido.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id do restaurante deve ser um número inteiro.' })
  @Min(1)
  restaurantId: number;

  @ApiProperty({
    description: 'Soma dos itens da sacola, em reais, sem frete nem gorjeta.',
    example: 100,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor dos itens é inválido.' })
  @Min(0)
  itemsValue: number;
}

export class ResponseValidateCouponDto {
  @ApiProperty({ description: 'Código normalizado do cupom.', example: 'BEMVINDO10' })
  code: string;

  @ApiProperty({ enum: ['Percent', 'Fixed', 'FreeShipping'], example: 'Percent' })
  type: string;

  @ApiProperty({
    description:
      'Desconto que o cupom concederia. É uma PRÉ-VISUALIZAÇÃO: o valor definitivo é ' +
      'recalculado na criação do pedido a partir dos preços reais do cardápio.',
    example: '10.00',
  })
  discount: string;

  @ApiProperty({
    description: 'Descrição do cupom, para exibir na sacola.',
    example: '10% de desconto na primeira compra',
    required: false,
  })
  description?: string;
}
