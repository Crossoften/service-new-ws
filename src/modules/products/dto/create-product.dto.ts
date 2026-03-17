import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProductTransactionType } from '../enums/product-transaction-type.enum';

export class CreateProductDto {
  @ApiProperty({
    description: 'Identificador da categoria vinculada ao produto.',
    example: '3',
    type: String,
  })
  @IsNumberString()
  categoryId: number;

  @ApiProperty({
    description: 'Tipo de negociação do produto. Pode ser somente aluguel, somente venda ou ambos.',
    enum: ProductTransactionType,
    enumName: 'ProductTransactionType',
    example: ProductTransactionType.Sale,
  })
  @IsEnum(ProductTransactionType)
  transactionType: ProductTransactionType;

  @ApiProperty({
    description: 'Nome principal do produto.',
    example: 'Fiat Bravo',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiProperty({
    description: 'Modelo do produto.',
    required: false,
    nullable: true,
    example: 'Essence 1.8',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  model?: string;

  @ApiProperty({
    description: 'Ano do produto.',
    required: false,
    nullable: true,
    example: '2016',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Valor do produto em formato decimal com duas casas.',
    example: '45000.00',
    type: String,
  })
  @IsNumberString()
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do produto.',
    required: false,
    nullable: true,
    example: 'Veículo em ótimo estado, revisado e com baixa quilometragem.',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do produto.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/products/fiat-bravo.png',
    type: String,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem do produto no storage.',
    required: false,
    nullable: true,
    example: 'products/fiat-bravo.png',
    type: String,
  })
  @IsString()
  @IsOptional()
  imageKey?: string;

  @ApiProperty({
    description: 'Indica se o produto deve ser criado como ativo.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsString()
  @IsOptional()
  isActive?: boolean | string;
}
