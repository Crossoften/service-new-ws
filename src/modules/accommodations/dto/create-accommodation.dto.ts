import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAccommodationDto {
  @ApiProperty({
    description: 'Identificador da categoria vinculada à hospedagem.',
    example: '3',
    type: String,
  })
  @IsNumberString()
  categoryId: number;

  @ApiProperty({
    description: 'Nome principal da hospedagem.',
    example: 'Novo Leste Hotel',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiProperty({
    description: 'Rua ou endereço principal da hospedagem.',
    required: false,
    nullable: true,
    example: 'Rua das Palmeiras, 120',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  street?: string;

  @ApiProperty({
    description: 'Bairro da hospedagem.',
    required: false,
    nullable: true,
    example: 'Centro',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  neighborhood?: string;

  @ApiProperty({
    description: 'Cidade da hospedagem.',
    required: false,
    nullable: true,
    example: 'Uberlândia',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  city?: string;

  @ApiProperty({
    description: 'Estado da hospedagem.',
    required: false,
    nullable: true,
    example: 'Minas Gerais',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  state?: string;

  @ApiProperty({
    description: 'Quantidade de quartos disponíveis.',
    required: false,
    nullable: true,
    example: '200',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  roomsQuantity?: number;

  @ApiProperty({
    description: 'Valor da hospedagem em formato decimal com duas casas.',
    example: '320.00',
    type: String,
  })
  @IsNumberString()
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada da hospedagem.',
    required: false,
    nullable: true,
    example: 'Hospedagem com café da manhã incluso e estacionamento privativo.',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem da hospedagem.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/accommodations/novo-leste-hotel.png',
    type: String,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem da hospedagem no storage.',
    required: false,
    nullable: true,
    example: 'accommodations/novo-leste-hotel.png',
    type: String,
  })
  @IsString()
  @IsOptional()
  imageKey?: string;

  @ApiProperty({
    description: 'Indica se a hospedagem deve ser criada como ativa.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsString()
  @IsOptional()
  isActive?: boolean | string;
}
