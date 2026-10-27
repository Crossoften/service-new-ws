import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryAssignmentStatusEnum } from '@prisma/client';

export class ResponseDeliveryAddressDto {
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

  /**
   * Coordenadas do endereço, em texto — mesmo formato de `currentLat`/
   * `currentLng`, para o app tratar os três pontos do mapa da mesma forma.
   *
   * Podem vir ausentes: a coluna é opcional e quem a preenche é o front, ao
   * geocodificar o endereço escolhido. Endereço cadastrado antes disso não tem
   * coordenada, e pedido sem coordenada cai na taxa padrão de entrega — então
   * a tela precisa de um caminho para quando faltar, em vez de assumir que
   * sempre vem.
   */
  @ApiPropertyOptional({ description: 'Latitude do endereço.', example: '-23.5505199' })
  latitude?: string;

  @ApiPropertyOptional({ description: 'Longitude do endereço.', example: '-46.6333094' })
  longitude?: string;
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
