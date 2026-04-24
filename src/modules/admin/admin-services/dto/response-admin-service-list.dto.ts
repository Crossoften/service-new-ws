import { ApiProperty } from '@nestjs/swagger';
import { ServiceTypeEnum } from '@prisma/client';

class ServiceCategoryBriefDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Restaurante', type: String })
  name: string;
}

class ServiceProviderBriefDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Julio Gonçalves', type: String })
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/photo.png',
    type: String,
  })
  fileUrl?: string;
}

export class ResponseAdminServiceListItemDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Instalação Hidráulica', type: String })
  name: string;

  @ApiProperty({ enum: ServiceTypeEnum, enumName: 'ServiceTypeEnum' })
  type: ServiceTypeEnum;

  @ApiProperty({ type: ServiceCategoryBriefDto })
  category: ServiceCategoryBriefDto;

  @ApiProperty({ type: ServiceProviderBriefDto })
  provider: ServiceProviderBriefDto;

  @ApiProperty({ example: 150.0, type: Number })
  price: number;

  @ApiProperty({ description: 'Total de avaliações.', example: 12, type: Number })
  totalReviews: number;

  @ApiProperty({ description: 'Total de avaliações positivas.', example: 10, type: Number })
  positiveReviews: number;

  @ApiProperty({ description: 'Total de avaliações negativas.', example: 2, type: Number })
  negativeReviews: number;

  @ApiProperty({ example: true, type: Boolean })
  isActive: boolean;
}

export class ResponseFindAllAdminServiceDto {
  @ApiProperty({ type: [ResponseAdminServiceListItemDto] })
  services: ResponseAdminServiceListItemDto[];

  @ApiProperty({ example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ example: 5, type: Number })
  totalPages: number;

  @ApiProperty({ example: 48, type: Number })
  totalRecords: number;
}
