import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAccommodationDto {
  @ApiProperty({
    description: 'Busca textual por nome, cidade, estado, categoria ou nome do anunciante.',
    required: false,
    example: 'Uberlândia',
  })
  @IsString({ message: 'O campo search deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtro textual aplicado sobre o nome da hospedagem.',
    required: false,
    example: 'Novo Leste',
  })
  @IsString({ message: 'O campo name deve ser um texto.' })
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Filtro opcional pela cidade da hospedagem.',
    required: false,
    example: 'Uberlândia',
  })
  @IsString({ message: 'O campo city deve ser um texto.' })
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo estado da hospedagem.',
    required: false,
    example: 'Minas Gerais',
  })
  @IsString({ message: 'O campo state deve ser um texto.' })
  @IsOptional()
  state?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo identificador da categoria.',
    required: false,
    example: 3,
  })
  @Type(() => Number)
  @IsInt({ message: 'O campo categoryId deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @ApiProperty({
    description: 'Filtro opcional pelo identificador do dono da hospedagem.',
    required: false,
    example: 15,
  })
  @Type(() => Number)
  @IsInt({ message: 'O campo userId deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  userId?: number;

  @ApiProperty({
    description: 'Filtro opcional por status ativo/inativo da hospedagem.',
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

  @ApiProperty({
    description: 'Quantidade de registros retornados por página.',
    required: false,
    example: 10,
  })
  @Type(() => Number)
  @IsInt({ message: 'O campo take deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  take?: number;

  @ApiProperty({ description: 'Página atual da listagem paginada.', required: false, example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O campo skip deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  skip?: number;
}
