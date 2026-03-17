import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTransportationDto {
  @ApiProperty({
    description: 'Identificador da categoria vinculada ao transporte.',
    example: '3',
    type: String,
  })
  @IsNumberString()
  categoryId: number;

  @ApiProperty({
    description: 'Nome principal do transporte.',
    example: 'Caminhão baú',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiProperty({
    description: 'Modelo do transporte.',
    required: false,
    nullable: true,
    example: 'Volkswagen Delivery 11.180',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  model?: string;

  @ApiProperty({
    description: 'Quilometragem rodada do transporte em quilômetros.',
    required: false,
    nullable: true,
    example: '41000',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  mileageKm?: number;

  @ApiProperty({
    description: 'Quantidade máxima de pessoas ou itens suportados pelo transporte.',
    required: false,
    nullable: true,
    example: '8',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  capacity?: number;

  @ApiProperty({
    description: 'Ano do transporte.',
    required: false,
    nullable: true,
    example: '2016',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Valor do transporte em formato decimal com duas casas.',
    example: '85000.00',
    type: String,
  })
  @IsNumberString()
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do transporte.',
    required: false,
    nullable: true,
    example: 'Transporte revisado, pronto para operação e com documentação em dia.',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do transporte.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/transportations/caminhao-bau.png',
    type: String,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem do transporte no storage.',
    required: false,
    nullable: true,
    example: 'transportations/caminhao-bau.png',
    type: String,
  })
  @IsString()
  @IsOptional()
  imageKey?: string;

  @ApiProperty({
    description: 'Indica se o transporte deve ser criado como ativo.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsString()
  @IsOptional()
  isActive?: boolean | string;
}
