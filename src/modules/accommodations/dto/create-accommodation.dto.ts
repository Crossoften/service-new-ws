import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAccommodationDto {
  @ApiProperty({
    description: 'Identificador da categoria vinculada à hospedagem.',
    example: '3',
    type: String,
  })
  @IsNumberString({}, { message: 'O id da categoria deve conter apenas números.' })
  categoryId: number;

  @ApiProperty({
    description: 'Nome principal da hospedagem.',
    example: 'Novo Leste Hotel',
    type: String,
  })
  @IsString({ message: 'O nome da hospedagem deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da hospedagem é obrigatório.' })
  @MaxLength(160, { message: 'O nome da hospedagem deve ter no máximo 160 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Rua ou endereço principal da hospedagem.',
    required: false,
    nullable: true,
    example: 'Rua das Palmeiras, 120',
    type: String,
  })
  @IsString({ message: 'A rua da hospedagem deve ser um texto.' })
  @IsOptional()
  @MaxLength(160, { message: 'A rua deve ter no máximo 160 caracteres.' })
  street?: string;

  @ApiProperty({
    description: 'Bairro da hospedagem.',
    required: false,
    nullable: true,
    example: 'Centro',
    type: String,
  })
  @IsString({ message: 'O bairro da hospedagem deve ser um texto.' })
  @IsOptional()
  @MaxLength(120, { message: 'O bairro deve ter no máximo 120 caracteres.' })
  neighborhood?: string;

  @ApiProperty({
    description: 'Cidade da hospedagem.',
    required: false,
    nullable: true,
    example: 'Uberlândia',
    type: String,
  })
  @IsString({ message: 'A cidade da hospedagem deve ser um texto.' })
  @IsOptional()
  @MaxLength(120, { message: 'A cidade deve ter no máximo 120 caracteres.' })
  city?: string;

  @ApiProperty({
    description: 'Estado da hospedagem.',
    required: false,
    nullable: true,
    example: 'Minas Gerais',
    type: String,
  })
  @IsString({ message: 'O estado da hospedagem deve ser um texto.' })
  @IsOptional()
  @MaxLength(120, { message: 'O estado deve ter no máximo 120 caracteres.' })
  state?: string;

  @ApiProperty({
    description: 'Quantidade de quartos disponíveis.',
    required: false,
    nullable: true,
    example: '200',
    type: String,
  })
  @IsNumberString({}, { message: 'A quantidade de quartos deve conter apenas números.' })
  @IsOptional()
  roomsQuantity?: number;

  @ApiProperty({
    description: 'Valor da hospedagem em formato decimal com duas casas.',
    example: '320.00',
    type: String,
  })
  @IsNumberString({}, { message: 'O preço da hospedagem deve conter apenas números.' })
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada da hospedagem.',
    required: false,
    nullable: true,
    example: 'Hospedagem com café da manhã incluso e estacionamento privativo.',
    type: String,
  })
  @IsString({ message: 'A descrição da hospedagem deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem da hospedagem.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/accommodations/novo-leste-hotel.png',
    type: String,
  })
  @IsString({ message: 'A URL da imagem deve ser um texto.' })
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem da hospedagem no storage.',
    required: false,
    nullable: true,
    example: 'accommodations/novo-leste-hotel.png',
    type: String,
  })
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  @IsOptional()
  imageKey?: string;

  @ApiProperty({
    description: 'Indica se a hospedagem deve ser criada como ativa.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsString({ message: 'O campo isActive deve ser enviado como texto.' })
  @IsOptional()
  isActive?: boolean | string;
}
