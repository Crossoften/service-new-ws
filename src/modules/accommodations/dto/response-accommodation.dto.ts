import { ApiProperty } from '@nestjs/swagger';
import { ResponseAccommodationCategoryDto } from './response-accommodation-category.dto';

export class ResponseAccommodationOwnerDto {
  @ApiProperty({ description: 'Identificador do dono da hospedagem.', example: 15, type: Number })
  id: number;

  @ApiProperty({
    description: 'Nome do dono da hospedagem.',
    example: 'Joelson Silva',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Email do dono da hospedagem.',
    example: 'joelson@email.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Telefone do dono da hospedagem.',
    required: false,
    nullable: true,
    example: '(34) 9 9290-0000',
    type: String,
  })
  phone?: string;
}

export class ResponseAccommodationListCategoryDto {
  @ApiProperty({ description: 'Identificador da categoria.', example: 3, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome da categoria.', example: 'Hotel', type: String })
  name: string;

  @ApiProperty({ description: 'Slug da categoria.', example: 'hotel', type: String })
  slug: string;

  @ApiProperty({
    description: 'URL pública do ícone da categoria.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/accommodation-categories/hotel.png',
    type: String,
  })
  iconUrl?: string;
}

export class ResponseAccommodationListOwnerDto {
  @ApiProperty({ description: 'Identificador do dono da hospedagem.', example: 15, type: Number })
  id: number;

  @ApiProperty({
    description: 'Nome do dono da hospedagem.',
    example: 'Joelson Silva',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Telefone do dono da hospedagem.',
    required: false,
    nullable: true,
    example: '(34) 9 9290-0000',
    type: String,
  })
  phone?: string;
}

export class ResponseAccommodationListItemDto {
  @ApiProperty({ description: 'Identificador da hospedagem.', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome da hospedagem.', example: 'Novo Leste Hotel', type: String })
  name: string;

  @ApiProperty({
    description: 'Cidade da hospedagem.',
    required: false,
    nullable: true,
    example: 'Uberlândia',
    type: String,
  })
  city?: string;

  @ApiProperty({
    description: 'Estado da hospedagem.',
    required: false,
    nullable: true,
    example: 'Minas Gerais',
    type: String,
  })
  state?: string;

  @ApiProperty({
    description: 'Quantidade de quartos disponíveis.',
    required: false,
    nullable: true,
    example: 200,
    type: Number,
  })
  roomsQuantity?: number;

  @ApiProperty({
    description: 'Preço formatado com duas casas decimais.',
    example: '320.00',
    type: String,
  })
  price: string;

  @ApiProperty({
    description: 'Descrição resumida da hospedagem.',
    required: false,
    nullable: true,
    example: 'Hospedagem com café da manhã incluso.',
    type: String,
  })
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem da hospedagem.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/accommodations/novo-leste-hotel.png',
    type: String,
  })
  imageUrl?: string;

  @ApiProperty({ description: 'Indica se a hospedagem está ativa.', example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({
    description: 'Dados resumidos da categoria vinculada à hospedagem.',
    type: ResponseAccommodationListCategoryDto,
  })
  category: ResponseAccommodationListCategoryDto;

  @ApiProperty({
    description: 'Dados resumidos do usuário dono da hospedagem.',
    type: ResponseAccommodationListOwnerDto,
  })
  user: ResponseAccommodationListOwnerDto;
}

export class ResponseAccommodationDto {
  @ApiProperty({ description: 'Identificador da hospedagem.', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome da hospedagem.', example: 'Novo Leste Hotel', type: String })
  name: string;

  @ApiProperty({
    description: 'Rua ou endereço principal da hospedagem.',
    required: false,
    nullable: true,
    example: 'Rua das Palmeiras, 120',
    type: String,
  })
  street?: string;

  @ApiProperty({
    description: 'Bairro da hospedagem.',
    required: false,
    nullable: true,
    example: 'Centro',
    type: String,
  })
  neighborhood?: string;

  @ApiProperty({
    description: 'Cidade da hospedagem.',
    required: false,
    nullable: true,
    example: 'Uberlândia',
    type: String,
  })
  city?: string;

  @ApiProperty({
    description: 'Estado da hospedagem.',
    required: false,
    nullable: true,
    example: 'Minas Gerais',
    type: String,
  })
  state?: string;

  @ApiProperty({
    description: 'Quantidade de quartos disponíveis.',
    required: false,
    nullable: true,
    example: 200,
    type: Number,
  })
  roomsQuantity?: number;

  @ApiProperty({
    description: 'Preço formatado com duas casas decimais.',
    example: '320.00',
    type: String,
  })
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada da hospedagem.',
    required: false,
    nullable: true,
    example: 'Hospedagem com café da manhã incluso e estacionamento privativo.',
    type: String,
  })
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem da hospedagem.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/accommodations/novo-leste-hotel.png',
    type: String,
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem da hospedagem no storage.',
    required: false,
    nullable: true,
    example: 'accommodations/novo-leste-hotel.png',
    type: String,
  })
  imageKey?: string;

  @ApiProperty({ description: 'Indica se a hospedagem está ativa.', example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({ description: 'Id da categoria vinculada.', example: 3, type: Number })
  categoryId: number;

  @ApiProperty({
    description: 'Dados completos da categoria vinculada à hospedagem.',
    type: ResponseAccommodationCategoryDto,
  })
  category: ResponseAccommodationCategoryDto;

  @ApiProperty({ description: 'Id do usuário dono da hospedagem.', example: 15, type: Number })
  userId: number;

  @ApiProperty({
    description: 'Dados completos do usuário dono da hospedagem.',
    type: ResponseAccommodationOwnerDto,
  })
  user: ResponseAccommodationOwnerDto;

  @ApiProperty({
    description: 'Data de criação da hospedagem em formato ISO 8601.',
    example: '2026-03-17T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização da hospedagem em formato ISO 8601.',
    example: '2026-03-17T10:00:00.000Z',
    type: String,
  })
  updatedAt: Date;
}
