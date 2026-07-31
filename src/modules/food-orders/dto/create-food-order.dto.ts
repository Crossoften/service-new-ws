import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethodEnum } from '@prisma/client';
import { CreateFoodOrderItemDto } from './create-food-order-item.dto';

export class CreateFoodOrderDto {
  @ApiProperty({ description: 'Id do restaurante.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id do restaurante deve ser um número inteiro.' })
  @Min(1)
  restaurantId: number;

  @ApiProperty({ description: 'Método de pagamento.', enum: PaymentMethodEnum })
  @IsEnum(PaymentMethodEnum, { message: 'O método de pagamento é inválido.' })
  paymentMethod: PaymentMethodEnum;

  @ApiPropertyOptional({ description: 'Taxa de entrega.', example: 8.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'A taxa de entrega deve ser um número válido.' })
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ description: 'Observações do pedido.' })
  @IsOptional()
  @IsString({ message: 'As observações devem ser um texto.' })
  notes?: string;

  @ApiProperty({ description: 'Itens do pedido.', type: [CreateFoodOrderItemDto] })
  @IsArray({ message: 'Os itens devem ser uma lista.' })
  @ValidateNested({ each: true })
  @Type(() => CreateFoodOrderItemDto)
  items: CreateFoodOrderItemDto[];
}
