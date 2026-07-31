import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponseRestaurantCategoryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  iconUrl?: string;
}

class ResponseMenuItemAdditionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  isActive: boolean;
}

class ResponseMenuItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  price: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  menuCategoryId: number;

  @ApiPropertyOptional({ type: [ResponseMenuItemAdditionDto] })
  additions?: ResponseMenuItemAdditionDto[];
}

export class ResponseMenuCategoryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional({ type: [ResponseMenuItemDto] })
  items?: ResponseMenuItemDto[];
}

export class ResponseRestaurantDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isOpen: boolean;

  @ApiProperty({ type: ResponseRestaurantCategoryDto })
  category: ResponseRestaurantCategoryDto;

  @ApiProperty()
  userId: number;

  @ApiPropertyOptional({ type: [ResponseMenuCategoryDto] })
  menuCategories?: ResponseMenuCategoryDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateRestaurantResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseRestaurantDto })
  restaurant: ResponseRestaurantDto;
}

export class ResponseRestaurantPayoutDto {
  @ApiProperty({ enum: ['None', 'Subscription', 'Commission'] })
  billingType: string;

  @ApiPropertyOptional({ description: 'Percentual de comissão negociado com o estabelecimento.' })
  commissionRate?: string;

  @ApiProperty({ description: 'Total de pedidos entregues considerados no relatório.' })
  totalOrders: number;

  @ApiProperty({ description: 'Soma do valor dos itens dos pedidos entregues.' })
  totalItemsValue: string;

  @ApiProperty({ description: 'Soma da comissão retida pela plataforma sobre os pedidos.' })
  totalCommission: string;

  @ApiProperty({ description: 'Valor líquido a repassar ao estabelecimento (itens - comissão).' })
  netAmount: string;
}

export class ResponseFindAllRestaurantDto {
  @ApiProperty({ type: [ResponseRestaurantDto] })
  restaurants: ResponseRestaurantDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
