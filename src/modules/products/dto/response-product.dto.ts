import { ApiProperty } from '@nestjs/swagger';
import { ProductTransactionType } from '../enums/product-transaction-type.enum';
import { ResponseProductCategoryDto } from './response-product-category.dto';

export class ResponseProductOwnerDto {
  @ApiProperty({ description: 'Identificador do dono do produto.', example: 15, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome do dono do produto.', example: 'Joelson Silva', type: String })
  name: string;

  @ApiProperty({
    description: 'Email do dono do produto.',
    example: 'joelson@email.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Telefone do dono do produto.',
    required: false,
    nullable: true,
    example: '(34) 9 9290-0000',
    type: String,
  })
  phone?: string;
}

export class ResponseProductListCategoryDto {
  @ApiProperty({ description: 'Identificador da categoria.', example: 3, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome da categoria.', example: 'Carro', type: String })
  name: string;

  @ApiProperty({ description: 'Slug da categoria.', example: 'carro', type: String })
  slug: string;

  @ApiProperty({
    description: 'URL pública do ícone da categoria.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/product-categories/carro.png',
    type: String,
  })
  iconUrl?: string;
}

export class ResponseProductListOwnerDto {
  @ApiProperty({ description: 'Identificador do dono do produto.', example: 15, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome do dono do produto.', example: 'Joelson Silva', type: String })
  name: string;

  @ApiProperty({
    description: 'Telefone do dono do produto.',
    required: false,
    nullable: true,
    example: '(34) 9 9290-0000',
    type: String,
  })
  phone?: string;
}

export class ResponseProductListItemDto {
  @ApiProperty({ description: 'Identificador do produto.', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome do produto.', example: 'Fiat Bravo', type: String })
  name: string;

  @ApiProperty({
    description: 'Tipo de negociação do produto.',
    enum: ProductTransactionType,
    enumName: 'ProductTransactionType',
    example: ProductTransactionType.Sale,
  })
  transactionType: ProductTransactionType;

  @ApiProperty({
    description: 'Modelo do produto.',
    required: false,
    nullable: true,
    example: 'Essence 1.8',
    type: String,
  })
  model?: string;

  @ApiProperty({
    description: 'Ano do produto.',
    required: false,
    nullable: true,
    example: 2016,
    type: Number,
  })
  year?: number;

  @ApiProperty({
    description: 'Preço formatado com duas casas decimais.',
    example: '45000.00',
    type: String,
  })
  price: string;

  @ApiProperty({
    description: 'Descrição resumida do produto.',
    required: false,
    nullable: true,
    example: 'Veículo em ótimo estado de conservação.',
    type: String,
  })
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do produto.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/products/fiat-bravo.png',
    type: String,
  })
  imageUrl?: string;

  @ApiProperty({ description: 'Indica se o produto está ativo.', example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({
    description: 'Dados resumidos da categoria vinculada ao produto.',
    type: ResponseProductListCategoryDto,
  })
  category: ResponseProductListCategoryDto;

  @ApiProperty({
    description: 'Dados resumidos do usuário dono do produto.',
    type: ResponseProductListOwnerDto,
  })
  user: ResponseProductListOwnerDto;

  @ApiProperty({
    description: 'Quantidade total de avaliações positivas do produto.',
    example: 25,
    type: Number,
  })
  positiveReviews: number;

  @ApiProperty({
    description: 'Quantidade total de avaliações negativas do produto.',
    example: 4,
    type: Number,
  })
  negativeReviews: number;
}

export class ResponseProductDto {
  @ApiProperty({ description: 'Identificador do produto.', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome do produto.', example: 'Fiat Bravo', type: String })
  name: string;

  @ApiProperty({
    description: 'Tipo de negociação do produto.',
    enum: ProductTransactionType,
    enumName: 'ProductTransactionType',
    example: ProductTransactionType.Sale,
  })
  transactionType: ProductTransactionType;

  @ApiProperty({
    description: 'Modelo do produto.',
    required: false,
    nullable: true,
    example: 'Essence 1.8',
    type: String,
  })
  model?: string;

  @ApiProperty({
    description: 'Ano do produto.',
    required: false,
    nullable: true,
    example: 2016,
    type: Number,
  })
  year?: number;

  @ApiProperty({
    description: 'Preço formatado com duas casas decimais.',
    example: '45000.00',
    type: String,
  })
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do produto.',
    required: false,
    nullable: true,
    example: 'Veículo em ótimo estado de conservação.',
    type: String,
  })
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do produto.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/products/fiat-bravo.png',
    type: String,
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem do produto no storage.',
    required: false,
    nullable: true,
    example: 'products/fiat-bravo.png',
    type: String,
  })
  imageKey?: string;

  @ApiProperty({ description: 'Indica se o produto está ativo.', example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({ description: 'Id da categoria vinculada.', example: 3, type: Number })
  categoryId: number;

  @ApiProperty({
    description: 'Dados da categoria vinculada ao produto.',
    type: ResponseProductCategoryDto,
  })
  category: ResponseProductCategoryDto;

  @ApiProperty({ description: 'Id do usuário dono do produto.', example: 15, type: Number })
  userId: number;

  @ApiProperty({
    description: 'Dados resumidos do usuário dono do produto.',
    type: ResponseProductOwnerDto,
  })
  user: ResponseProductOwnerDto;

  @ApiProperty({
    description: 'Quantidade total de avaliações positivas do produto.',
    example: 25,
    type: Number,
  })
  positiveReviews: number;

  @ApiProperty({
    description: 'Quantidade total de avaliações negativas do produto.',
    example: 4,
    type: Number,
  })
  negativeReviews: number;

  @ApiProperty({
    description: 'Data de criação do produto em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do produto em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  updatedAt: Date;
}
