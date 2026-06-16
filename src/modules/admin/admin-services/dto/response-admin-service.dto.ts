import { ApiProperty } from '@nestjs/swagger';
import { ServiceTypeEnum } from '@prisma/client';

class ServiceCategoryDetailDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Restaurante', type: String })
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/icon.png',
    type: String,
  })
  iconUrl?: string;
}

class ServiceProviderDetailDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Julio Gonçalves', type: String })
  name: string;

  @ApiProperty({ required: false, nullable: true, example: 'contato@julio.com', type: String })
  email?: string;

  @ApiProperty({ required: false, nullable: true, example: '(34) 9 9000-0000', type: String })
  phone?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/photo.png',
    type: String,
  })
  fileUrl?: string;
}

export class ResponseAdminServiceDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Instalação Hidráulica', type: String })
  name: string;

  @ApiProperty({ enum: ServiceTypeEnum, enumName: 'ServiceTypeEnum' })
  type: ServiceTypeEnum;

  @ApiProperty({ required: false, nullable: true, example: 'REG-001', type: String })
  registrationCode?: string;

  @ApiProperty({ example: 150.0, type: Number })
  price: number;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Serviço especializado em...',
    type: String,
  })
  description?: string;

  @ApiProperty({ description: 'Taxa da plataforma (%)', example: 10, type: Number })
  platformFeeRate: number;

  @ApiProperty({ description: 'Valor recebido pela plataforma.', example: 15.0, type: Number })
  platformValueReceived: number;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/img.png',
    type: String,
  })
  imageUrl?: string;

  @ApiProperty({ example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({ type: ServiceCategoryDetailDto })
  category: ServiceCategoryDetailDto;

  @ApiProperty({ type: ServiceProviderDetailDto })
  provider: ServiceProviderDetailDto;

  @ApiProperty({ description: 'Total de avaliações.', example: 12, type: Number })
  totalReviews: number;

  @ApiProperty({ description: 'Total de avaliações positivas.', example: 10, type: Number })
  positiveReviews: number;

  @ApiProperty({ description: 'Total de avaliações negativas.', example: 2, type: Number })
  negativeReviews: number;

  @ApiProperty({ description: 'Total de works (execuções) do serviço.', example: 30, type: Number })
  totalWorks: number;

  @ApiProperty({ example: '2026-03-16T10:00:00.000Z', type: String })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-16T10:00:00.000Z', type: String })
  updatedAt: Date;
}
