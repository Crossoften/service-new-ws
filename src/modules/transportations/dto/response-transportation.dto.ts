import { ApiProperty } from '@nestjs/swagger';
import { ResponseTransportationCategoryDto } from './response-transportation-category.dto';

export class ResponseTransportationOwnerDto {
  @ApiProperty({ description: 'Identificador do dono do transporte.', example: 15, type: Number })
  id: number;

  @ApiProperty({
    description: 'Nome do dono do transporte.',
    example: 'Joelson Silva',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Email do dono do transporte.',
    example: 'joelson@email.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Telefone do dono do transporte.',
    required: false,
    nullable: true,
    example: '(34) 9 9290-0000',
    type: String,
  })
  phone?: string;
}

export class ResponseTransportationListCategoryDto {
  @ApiProperty({ description: 'Identificador da categoria.', example: 3, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome da categoria.', example: 'Caminhão baú', type: String })
  name: string;

  @ApiProperty({ description: 'Slug da categoria.', example: 'caminhao-bau', type: String })
  slug: string;

  @ApiProperty({
    description: 'URL pública do ícone da categoria.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/transportation-categories/caminhao-bau.png',
    type: String,
  })
  iconUrl?: string;
}

export class ResponseTransportationListOwnerDto {
  @ApiProperty({ description: 'Identificador do dono do transporte.', example: 15, type: Number })
  id: number;

  @ApiProperty({
    description: 'Nome do dono do transporte.',
    example: 'Joelson Silva',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Telefone do dono do transporte.',
    required: false,
    nullable: true,
    example: '(34) 9 9290-0000',
    type: String,
  })
  phone?: string;
}

export class ResponseTransportationListItemDto {
  @ApiProperty({ description: 'Identificador do transporte.', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome do transporte.', example: 'Caminhão baú', type: String })
  name: string;

  @ApiProperty({
    description: 'Modelo do transporte.',
    required: false,
    nullable: true,
    example: 'Volkswagen Delivery 11.180',
    type: String,
  })
  model?: string;

  @ApiProperty({
    description: 'Quilometragem rodada do transporte em quilômetros.',
    required: false,
    nullable: true,
    example: 41000,
    type: Number,
  })
  mileageKm?: number;

  @ApiProperty({
    description: 'Quantidade máxima de pessoas ou itens suportados.',
    required: false,
    nullable: true,
    example: 8,
    type: Number,
  })
  capacity?: number;

  @ApiProperty({
    description: 'Ano do transporte.',
    required: false,
    nullable: true,
    example: 2016,
    type: Number,
  })
  year?: number;

  @ApiProperty({
    description: 'Preço formatado com duas casas decimais.',
    example: '85000.00',
    type: String,
  })
  price: string;

  @ApiProperty({
    description: 'Descrição resumida do transporte.',
    required: false,
    nullable: true,
    example: 'Transporte com manutenção em dia e pronto para operação.',
    type: String,
  })
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do transporte.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/transportations/caminhao-bau.png',
    type: String,
  })
  imageUrl?: string;

  @ApiProperty({ description: 'Indica se o transporte está ativo.', example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({
    description: 'Dados resumidos da categoria vinculada ao transporte.',
    type: ResponseTransportationListCategoryDto,
  })
  category: ResponseTransportationListCategoryDto;

  @ApiProperty({
    description: 'Dados resumidos do usuário dono do transporte.',
    type: ResponseTransportationListOwnerDto,
  })
  user: ResponseTransportationListOwnerDto;
}

export class ResponseTransportationDto {
  @ApiProperty({ description: 'Identificador do transporte.', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome do transporte.', example: 'Caminhão baú', type: String })
  name: string;

  @ApiProperty({
    description: 'Modelo do transporte.',
    required: false,
    nullable: true,
    example: 'Volkswagen Delivery 11.180',
    type: String,
  })
  model?: string;

  @ApiProperty({
    description: 'Quilometragem rodada do transporte em quilômetros.',
    required: false,
    nullable: true,
    example: 41000,
    type: Number,
  })
  mileageKm?: number;

  @ApiProperty({
    description: 'Quantidade máxima de pessoas ou itens suportados.',
    required: false,
    nullable: true,
    example: 8,
    type: Number,
  })
  capacity?: number;

  @ApiProperty({
    description: 'Ano do transporte.',
    required: false,
    nullable: true,
    example: 2016,
    type: Number,
  })
  year?: number;

  @ApiProperty({
    description: 'Preço formatado com duas casas decimais.',
    example: '85000.00',
    type: String,
  })
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do transporte.',
    required: false,
    nullable: true,
    example: 'Transporte com manutenção em dia e pronto para operação.',
    type: String,
  })
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do transporte.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/transportations/caminhao-bau.png',
    type: String,
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem do transporte no storage.',
    required: false,
    nullable: true,
    example: 'transportations/caminhao-bau.png',
    type: String,
  })
  imageKey?: string;

  @ApiProperty({ description: 'Indica se o transporte está ativo.', example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({ description: 'Id da categoria vinculada.', example: 3, type: Number })
  categoryId: number;

  @ApiProperty({
    description: 'Dados da categoria vinculada ao transporte.',
    type: ResponseTransportationCategoryDto,
  })
  category: ResponseTransportationCategoryDto;

  @ApiProperty({ description: 'Id do usuário dono do transporte.', example: 15, type: Number })
  userId: number;

  @ApiProperty({
    description: 'Dados resumidos do usuário dono do transporte.',
    type: ResponseTransportationOwnerDto,
  })
  user: ResponseTransportationOwnerDto;

  @ApiProperty({
    description: 'Data de criação do transporte em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do transporte em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  updatedAt: Date;
}
