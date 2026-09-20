import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CouponTypeEnum } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({
    description:
      'Código que o cliente digita. Gravado em maiúsculas e comparado assim — ' +
      '`bemvindo10` e `BEMVINDO10` são o mesmo cupom.',
    example: 'BEMVINDO10',
  })
  @IsString({ message: 'O código deve ser um texto.' })
  @MaxLength(40, { message: 'O código não pode ter mais que 40 caracteres.' })
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'O código aceita apenas letras, números e hífen.',
  })
  code: string;

  @ApiPropertyOptional({ description: 'Descrição exibida na sacola.' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @MaxLength(255, { message: 'A descrição não pode ter mais que 255 caracteres.' })
  description?: string;

  @ApiProperty({
    enum: CouponTypeEnum,
    description:
      '`Percent` e `Fixed` descontam dos itens; `FreeShipping` zera o frete para o ' +
      'cliente, e o entregador recebe normalmente.',
  })
  @IsEnum(CouponTypeEnum, { message: 'O tipo do cupom é inválido.' })
  type: CouponTypeEnum;

  @ApiPropertyOptional({
    description:
      'Percentual (0–100) em `Percent`, valor em reais em `Fixed`. Ignorado em ' +
      '`FreeShipping`, onde o desconto é o próprio frete.',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor do cupom é inválido.' })
  @Min(0, { message: 'O valor do cupom não pode ser negativo.' })
  value?: number;

  @ApiPropertyOptional({
    description: 'Teto do desconto, em reais. Vale para cupom percentual.',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O teto de desconto é inválido.' })
  @Min(0)
  maxDiscountValue?: number;

  @ApiPropertyOptional({
    description:
      'Valor mínimo dos itens para o cupom valer. É o controle que mantém o desconto ' +
      'dentro da comissão do pedido — sem ele, cupom grande recusa em pedido pequeno.',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor mínimo é inválido.' })
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Início da vigência, ISO 8601.' })
  @IsOptional()
  @IsDateString({}, { message: 'O início da vigência deve ser uma data ISO 8601.' })
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Fim da vigência, ISO 8601.' })
  @IsOptional()
  @IsDateString({}, { message: 'O fim da vigência deve ser uma data ISO 8601.' })
  endsAt?: string;

  @ApiPropertyOptional({ description: 'Limite total de usos. Ausente = sem limite.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite de usos deve ser um número inteiro.' })
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Limite de usos por cliente. Ausente = sem limite.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite por cliente deve ser um número inteiro.' })
  @Min(1)
  maxUsesPerCustomer?: number;

  @ApiPropertyOptional({
    description: 'Restringe o cupom a um restaurante. Ausente, vale em todos.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O id do restaurante deve ser um número inteiro.' })
  @Min(1)
  restaurantId?: number;

  @ApiPropertyOptional({ description: 'Cupom ativo. Padrão: true.' })
  @IsOptional()
  @IsBoolean({ message: 'O campo isActive deve ser um booleano.' })
  isActive?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class ResponseCouponDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'BEMVINDO10' }) code: string;
  @ApiPropertyOptional({ example: '10% na primeira compra' }) description?: string;
  @ApiProperty({ enum: CouponTypeEnum }) type: CouponTypeEnum;
  @ApiPropertyOptional({ example: '10.00' }) value?: string;
  @ApiPropertyOptional({ example: '15.00' }) maxDiscountValue?: string;
  @ApiPropertyOptional({ example: '50.00' }) minOrderValue?: string;
  @ApiPropertyOptional() startsAt?: Date;
  @ApiPropertyOptional() endsAt?: Date;
  @ApiPropertyOptional({ example: 100 }) maxUses?: number;
  @ApiPropertyOptional({ example: 1 }) maxUsesPerCustomer?: number;
  @ApiPropertyOptional({ example: 1 }) restaurantId?: number;
  @ApiProperty({ example: true }) isActive: boolean;

  @ApiProperty({ description: 'Quantas vezes o cupom já foi resgatado.', example: 7 })
  timesUsed: number;

  @ApiProperty() createdAt: Date;
}
