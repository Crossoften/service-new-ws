import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryFeeTypeEnum } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertDeliveryFeeRuleDto {
  @ApiProperty({
    description: 'Início da faixa, em quilômetros. Inclusivo.',
    example: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'A distância mínima deve ser um número válido.' })
  @Min(0, { message: 'A distância mínima não pode ser negativa.' })
  minKm: number;

  @ApiPropertyOptional({
    description: 'Fim da faixa, em quilômetros. Exclusivo. Omita para "daqui em diante".',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'A distância máxima deve ser um número válido.' })
  @Min(0, { message: 'A distância máxima não pode ser negativa.' })
  maxKm?: number;

  @ApiProperty({
    description:
      'Fixed cobra o valor em reais. Percent cobra o percentual sobre o valor dos itens ' +
      'do pedido — nunca sobre o total, que já inclui a própria taxa.',
    enum: DeliveryFeeTypeEnum,
    example: DeliveryFeeTypeEnum.Fixed,
  })
  @IsEnum(DeliveryFeeTypeEnum, { message: 'O tipo da taxa é inválido.' })
  type: DeliveryFeeTypeEnum;

  @ApiProperty({
    description: 'Reais quando o tipo é Fixed, percentual quando é Percent.',
    example: 8.0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser um número válido.' })
  @Min(0, { message: 'O valor não pode ser negativo.' })
  value: number;

  @ApiPropertyOptional({ description: 'Faixa ativa. Padrão true.', example: true })
  @IsOptional()
  @IsBoolean({ message: 'O campo ativo deve ser verdadeiro ou falso.' })
  isActive?: boolean;
}
