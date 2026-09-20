import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResponseFoodOrderAddressDto } from './delivery-address.dto';
import { FoodOrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum } from '@prisma/client';

class ResponseFoodOrderUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  fileUrl?: string;
}

class ResponseFoodOrderRestaurantDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  userId: number;
}

class ResponseFoodOrderItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  menuItemId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: [Object] })
  additions: { id: number; name: string; price: string }[];
}

class ResponseFoodOrderDeliveryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  courierId?: number;

  @ApiPropertyOptional()
  currentLat?: string;

  @ApiPropertyOptional()
  currentLng?: string;

  @ApiPropertyOptional()
  locationUpdatedAt?: Date;
}

export class ResponseFoodOrderDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: FoodOrderStatusEnum })
  status: FoodOrderStatusEnum;

  @ApiProperty()
  itemsValue: string;

  @ApiProperty()
  deliveryFee: string;

  @ApiProperty({ description: 'Gorjeta ao entregador. `0.00` quando não houve.', example: '5.00' })
  tip: string;

  @ApiProperty({
    description:
      'Desconto do cupom. `0.00` quando não houve. Custeado pela plataforma: o restaurante ' +
      'recebe os itens integrais e o entregador recebe frete e gorjeta normalmente.',
    example: '10.00',
  })
  discount: string;

  @ApiProperty()
  totalValue: string;

  @ApiPropertyOptional()
  platformFeeRate?: string;

  @ApiPropertyOptional()
  commissionAmount?: string;

  @ApiProperty({ enum: PaymentMethodEnum })
  paymentMethod: PaymentMethodEnum;

  @ApiProperty({
    enum: PaymentStatusEnum,
    description:
      'Situação do pagamento. Pedidos em dinheiro nascem Pending e só passam a Paid ' +
      'quando quem entrega confirma o recebimento.',
  })
  paymentStatus: PaymentStatusEnum;

  @ApiPropertyOptional({
    description:
      'Horário pedido pelo cliente. Ausente é pedido para agora. Não altera o `status`: ' +
      'o restaurante usa este campo para separar o que é para já do que é para depois.',
    example: '2026-09-08T20:00:00.000Z',
  })
  scheduledFor?: Date;

  @ApiPropertyOptional({ description: 'Momento em que o pagamento foi confirmado.' })
  paidAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiPropertyOptional({
    description:
      'Endereço de entrega do pedido. Congelado como estava no momento do pedido: editar ' +
      'o perfil depois não reescreve para onde este pedido foi.',
    type: ResponseFoodOrderAddressDto,
  })
  deliveryAddress?: ResponseFoodOrderAddressDto;

  @ApiProperty({ description: 'Id da sala de chat do pedido.', example: 1 })
  chatRoomId: number;

  @ApiProperty({ type: ResponseFoodOrderRestaurantDto })
  restaurant: ResponseFoodOrderRestaurantDto;

  @ApiProperty({ type: ResponseFoodOrderUserDto })
  customer: ResponseFoodOrderUserDto;

  @ApiProperty({ type: [ResponseFoodOrderItemDto] })
  items: ResponseFoodOrderItemDto[];

  @ApiPropertyOptional({ type: ResponseFoodOrderDeliveryDto })
  delivery?: ResponseFoodOrderDeliveryDto;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateFoodOrderResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseFoodOrderDto })
  foodOrder: ResponseFoodOrderDto;
}

export class ResponseFindAllFoodOrderDto {
  @ApiProperty({ type: [ResponseFoodOrderDto] })
  foodOrders: ResponseFoodOrderDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
