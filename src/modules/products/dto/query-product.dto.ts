import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ProductTransactionType } from '../enums/product-transaction-type.enum';

export class QueryProductDto {
  @ApiProperty({
    description: 'Filtro textual aplicado sobre o nome do produto.',
    required: false,
    example: 'Fiat',
    type: String,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo identificador da categoria.',
    required: false,
    example: '3',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({
    description: 'Filtro opcional pelo identificador do dono do produto.',
    required: false,
    example: '15',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  userId?: number;

  @ApiProperty({
    description: 'Filtro opcional pelo tipo de negociação do produto.',
    required: false,
    enum: ProductTransactionType,
    enumName: 'ProductTransactionType',
    example: ProductTransactionType.Rent,
  })
  @IsEnum(ProductTransactionType)
  @IsOptional()
  transactionType?: ProductTransactionType;

  @ApiProperty({
    description: 'Filtro opcional por status ativo/inativo do produto.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsString()
  @IsOptional()
  isActive?: boolean | string;

  @ApiProperty({
    description: 'Quantidade de registros retornados por página.',
    required: false,
    example: '10',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  take?: number;

  @ApiProperty({
    description:
      'Página atual da listagem paginada. Apesar do nome do campo ser `skip`, o valor esperado é o número da página.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  skip?: number;
}
