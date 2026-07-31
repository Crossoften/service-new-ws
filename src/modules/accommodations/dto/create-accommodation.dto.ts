import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAccommodationDto {
  @ApiProperty({ description: 'Identificador da categoria vinculada à hospedagem.', example: 3 })
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria deve ser um número inteiro.' })
  @Min(1)
  categoryId: number;

  @ApiProperty({ description: 'Nome principal da hospedagem.', example: 'Novo Leste Hotel' })
  @IsString({ message: 'O nome da hospedagem deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da hospedagem é obrigatório.' })
  @MaxLength(160, { message: 'O nome da hospedagem deve ter no máximo 160 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Rua ou endereço principal da hospedagem.',
    required: false,
    nullable: true,
    example: 'Rua das Palmeiras, 120',
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
  })
  @IsString({ message: 'O estado da hospedagem deve ser um texto.' })
  @IsOptional()
  @MaxLength(120, { message: 'O estado deve ter no máximo 120 caracteres.' })
  state?: string;

  @ApiProperty({
    description: 'Quantidade de quartos disponíveis.',
    required: false,
    nullable: true,
    example: 200,
  })
  @Type(() => Number)
  @IsInt({ message: 'A quantidade de quartos deve ser um número inteiro.' })
  @Min(0)
  @IsOptional()
  roomsQuantity?: number;

  @ApiProperty({ description: 'Valor da hospedagem.', example: 320.0 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O preço da hospedagem deve ser um número válido.' },
  )
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Descrição detalhada da hospedagem.',
    required: false,
    nullable: true,
    example: 'Hospedagem com café da manhã incluso e estacionamento privativo.',
  })
  @IsString({ message: 'A descrição da hospedagem deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem da hospedagem.',
    required: false,
    nullable: true,
  })
  @IsString({ message: 'A URL da imagem deve ser um texto.' })
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem da hospedagem no storage.',
    required: false,
    nullable: true,
  })
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  @IsOptional()
  imageKey?: string;

  @ApiProperty({
    description: 'Indica se a hospedagem deve ser criada como ativa.',
    required: false,
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O campo isActive deve ser true ou false.' })
  @IsOptional()
  isActive?: boolean;
}
