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

export class CreateTransportationDto {
  @ApiProperty({ description: 'Identificador da categoria vinculada ao transporte.', example: 3 })
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria deve ser um número inteiro.' })
  @Min(1)
  categoryId: number;

  @ApiProperty({ description: 'Nome principal do transporte.', example: 'Caminhão baú' })
  @IsString({ message: 'O nome do transporte deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do transporte é obrigatório.' })
  @MaxLength(160, { message: 'O nome do transporte deve ter no máximo 160 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Modelo do transporte.',
    required: false,
    nullable: true,
    example: 'Volkswagen Delivery 11.180',
  })
  @IsString({ message: 'O modelo do transporte deve ser um texto.' })
  @IsOptional()
  @MaxLength(160, { message: 'O modelo deve ter no máximo 160 caracteres.' })
  model?: string;

  @ApiProperty({
    description: 'Quilometragem rodada em km.',
    required: false,
    nullable: true,
    example: 41000,
  })
  @Type(() => Number)
  @IsInt({ message: 'A quilometragem deve ser um número inteiro.' })
  @Min(0)
  @IsOptional()
  mileageKm?: number;

  @ApiProperty({
    description: 'Capacidade máxima do transporte.',
    required: false,
    nullable: true,
    example: 8,
  })
  @Type(() => Number)
  @IsInt({ message: 'A capacidade deve ser um número inteiro.' })
  @Min(0)
  @IsOptional()
  capacity?: number;

  @ApiProperty({
    description: 'Ano do transporte.',
    required: false,
    nullable: true,
    example: 2016,
  })
  @Type(() => Number)
  @IsInt({ message: 'O ano do transporte deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  year?: number;

  @ApiProperty({ description: 'Valor do transporte.', example: 85000.0 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O preço do transporte deve ser um número válido.' },
  )
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Descrição detalhada do transporte.',
    required: false,
    nullable: true,
    example: 'Transporte revisado.',
  })
  @IsString({ message: 'A descrição do transporte deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'URL pública da imagem.', required: false, nullable: true })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'Chave da imagem no storage.', required: false, nullable: true })
  @IsString()
  @IsOptional()
  imageKey?: string;

  @ApiProperty({
    description: 'Indica se o transporte deve ser criado como ativo.',
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
