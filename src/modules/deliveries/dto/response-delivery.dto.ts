import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryAssignmentStatusEnum } from '@prisma/client';

class ResponseDeliveryAddressDto {
  @ApiPropertyOptional()
  street?: string;

  @ApiPropertyOptional()
  neighborhood?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  zipCode?: string;

  @ApiPropertyOptional()
  number?: string;
}

class ResponseDeliveryRestaurantDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: ResponseDeliveryAddressDto })
  address?: ResponseDeliveryAddressDto;
}

class ResponseDeliveryCustomerDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

class ResponseDeliveryFoodOrderDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  deliveryFee: string;

  @ApiProperty({ type: ResponseDeliveryRestaurantDto })
  restaurant: ResponseDeliveryRestaurantDto;

  @ApiProperty({ type: ResponseDeliveryCustomerDto })
  customer: ResponseDeliveryCustomerDto;

  @ApiPropertyOptional({
    type: ResponseDeliveryAddressDto,
    description: 'Endereço de entrega do pedido.',
  })
  deliveryAddress?: ResponseDeliveryAddressDto;
}

export class ResponseDeliveryDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: DeliveryAssignmentStatusEnum })
  status: DeliveryAssignmentStatusEnum;

  @ApiPropertyOptional()
  courierId?: number;

  @ApiPropertyOptional()
  currentLat?: string;

  @ApiPropertyOptional()
  currentLng?: string;

  @ApiPropertyOptional()
  locationUpdatedAt?: Date;

  @ApiProperty({ type: ResponseDeliveryFoodOrderDto })
  foodOrder: ResponseDeliveryFoodOrderDto;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  pickedUpAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ResponseFindAllDeliveryDto {
  @ApiProperty({ type: [ResponseDeliveryDto] })
  deliveries: ResponseDeliveryDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
