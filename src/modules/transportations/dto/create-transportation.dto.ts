import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTransportationDto {
  @ApiProperty({
    description: 'Identificador da categoria vinculada ao transporte.',
    example: '3',
    type: String,
  })
  @IsNumberString({}, { message: 'O id da categoria deve conter apenas números.' })
  categoryId: number;

  @ApiProperty({
    description: 'Nome principal do transporte.',
    example: 'Caminhão baú',
    type: String,
  })
  @IsString({ message: 'O nome do transporte deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do transporte é obrigatório.' })
  @MaxLength(160, { message: 'O nome do transporte deve ter no máximo 160 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Modelo do transporte.',
    required: false,
    nullable: true,
    example: 'Volkswagen Delivery 11.180',
    type: String,
  })
  @IsString({ message: 'O modelo do transporte deve ser um texto.' })
  @IsOptional()
  @MaxLength(160, { message: 'O modelo deve ter no máximo 160 caracteres.' })
  model?: string;

  @ApiProperty({
    description: 'Quilometragem rodada do transporte em quilômetros.',
    required: false,
    nullable: true,
    example: '41000',
    type: String,
  })
  @IsNumberString({}, { message: 'A quilometragem deve conter apenas números.' })
  @IsOptional()
  mileageKm?: number;

  @ApiProperty({
    description: 'Quantidade máxima de pessoas ou itens suportados pelo transporte.',
    required: false,
    nullable: true,
    example: '8',
    type: String,
  })
  @IsNumberString({}, { message: 'A capacidade deve conter apenas números.' })
  @IsOptional()
  capacity?: number;

  @ApiProperty({
    description: 'Ano do transporte.',
    required: false,
    nullable: true,
    example: '2016',
    type: String,
  })
  @IsNumberString({}, { message: 'O ano do transporte deve conter apenas números.' })
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Valor do transporte em formato decimal com duas casas.',
    example: '85000.00',
    type: String,
  })
  @IsNumberString({}, { message: 'O preço do transporte deve conter apenas números.' })
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do transporte.',
    required: false,
    nullable: true,
    example: 'Transporte revisado, pronto para operação e com documentação em dia.',
    type: String,
  })
  @IsString({ message: 'A descrição do transporte deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do transporte.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/transportations/caminhao-bau.png',
    type: String,
  })
  @IsString({ message: 'A URL da imagem deve ser um texto.' })
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem do transporte no storage.',
    required: false,
    nullable: true,
    example: 'transportations/caminhao-bau.png',
    type: String,
  })
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  @IsOptional()
  imageKey?: string;

  @ApiProperty({
    description: 'Indica se o transporte deve ser criado como ativo.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsString({ message: 'O campo isActive deve ser um texto.' })
  @IsOptional()
  isActive?: boolean | string;
}
