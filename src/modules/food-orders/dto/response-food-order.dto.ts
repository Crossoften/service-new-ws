import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodOrderStatusEnum, PaymentMethodEnum } from '@prisma/client';

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

  @ApiProperty()
  totalValue: string;

  @ApiPropertyOptional()
  platformFeeRate?: string;

  @ApiPropertyOptional()
  commissionAmount?: string;

  @ApiProperty({ enum: PaymentMethodEnum })
  paymentMethod: PaymentMethodEnum;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiProperty()
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
