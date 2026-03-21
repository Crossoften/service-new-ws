import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProductTransactionTypeEnum } from '../enums/product-transaction-type.enum';

export class CreateProductDto {
  @ApiProperty({
    description: 'Identificador da categoria vinculada ao produto.',
    example: '3',
    type: String,
  })
  @IsNumberString({}, { message: 'O id da categoria deve conter apenas números.' })
  categoryId: number;

  @ApiProperty({
    description: 'Tipo de negociação do produto. Pode ser somente aluguel, somente venda ou ambos.',
    enum: ProductTransactionTypeEnum,
    enumName: 'ProductTransactionTypeEnum',
    example: ProductTransactionTypeEnum.Sale,
  })
  @IsEnum(ProductTransactionTypeEnum, { message: 'O tipo de negociação informado é inválido.' })
  transactionType: ProductTransactionTypeEnum;

  @ApiProperty({
    description: 'Nome principal do produto.',
    example: 'Fiat Bravo',
    type: String,
  })
  @IsString({ message: 'O nome do produto deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do produto é obrigatório.' })
  @MaxLength(160, { message: 'O nome do produto deve ter no máximo 160 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Modelo do produto.',
    required: false,
    nullable: true,
    example: 'Essence 1.8',
    type: String,
  })
  @IsString({ message: 'O modelo do produto deve ser um texto.' })
  @IsOptional()
  @MaxLength(160, { message: 'O modelo deve ter no máximo 160 caracteres.' })
  model?: string;

  @ApiProperty({
    description: 'Ano do produto.',
    required: false,
    nullable: true,
    example: '2016',
    type: String,
  })
  @IsNumberString({}, { message: 'O ano do produto deve conter apenas números.' })
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Valor do produto em formato decimal com duas casas.',
    example: '45000.00',
    type: String,
  })
  @IsNumberString({}, { message: 'O preço do produto deve conter apenas números.' })
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do produto.',
    required: false,
    nullable: true,
    example: 'Veículo em ótimo estado, revisado e com baixa quilometragem.',
    type: String,
  })
  @IsString({ message: 'A descrição do produto deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do produto.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/products/fiat-bravo.png',
    type: String,
  })
  @IsString({ message: 'A URL da imagem deve ser um texto.' })
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem do produto no storage.',
    required: false,
    nullable: true,
    example: 'products/fiat-bravo.png',
    type: String,
  })
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  @IsOptional()
  imageKey?: string;

  @ApiProperty({
    description: 'Indica se o produto deve ser criado como ativo.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsString({ message: 'O campo isActive deve ser um texto.' })
  @IsOptional()
  isActive?: boolean | string;
}
