import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethodEnum } from '@prisma/client';
import { CreateFoodOrderItemDto } from './create-food-order-item.dto';
import { DeliveryAddressDto } from './delivery-address.dto';

export class CreateFoodOrderDto {
  @ApiProperty({ description: 'Id do restaurante.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id do restaurante deve ser um número inteiro.' })
  @Min(1)
  restaurantId: number;

  @ApiProperty({ description: 'Método de pagamento.', enum: PaymentMethodEnum })
  @IsEnum(PaymentMethodEnum, { message: 'O método de pagamento é inválido.' })
  paymentMethod: PaymentMethodEnum;

  @ApiPropertyOptional({ description: 'Observações do pedido.' })
  @IsOptional()
  @IsString({ message: 'As observações devem ser um texto.' })
  notes?: string;

  @ApiProperty({ description: 'Itens do pedido.', type: [CreateFoodOrderItemDto] })
  @IsArray({ message: 'Os itens devem ser uma lista.' })
  @ValidateNested({ each: true })
  @Type(() => CreateFoodOrderItemDto)
  items: CreateFoodOrderItemDto[];

  @ApiPropertyOptional({
    description:
      'Endereço de entrega deste pedido. Omitido, o pedido usa o endereço do cadastro — ' +
      'o comportamento de sempre. Informado, vale só para este pedido e NÃO altera o ' +
      'perfil do cliente.',
    type: DeliveryAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ApiPropertyOptional({
    description:
      'Quando o cliente quer receber, em ISO 8601. Omitido, o pedido é para agora — o ' +
      'comportamento de sempre. Precisa ser no futuro. Não muda o status do pedido: serve ' +
      'para o restaurante separar o que é para já do que é para depois.',
    example: '2026-09-08T20:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'O horário de agendamento deve ser uma data ISO 8601 válida.' })
  scheduledFor?: string;

  @ApiPropertyOptional({
    description:
      'Gorjeta ao entregador, em reais. Entra no total cobrado e vai INTEIRA para o ' +
      'entregador — a plataforma não cobra comissão sobre ela. Omitida ou zero, o pedido ' +
      'segue sem gorjeta.',
    example: 5,
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'A gorjeta deve ter no máximo 2 casas decimais.' })
  @Min(0, { message: 'A gorjeta não pode ser negativa.' })
  @Max(1000, { message: 'A gorjeta não pode passar de R$ 1.000,00.' })
  tip?: number;
}
