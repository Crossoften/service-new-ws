import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryAccommodationDto {
  @ApiProperty({
    description: 'Busca textual por nome, cidade, estado, categoria ou nome do anunciante.',
    required: false,
    example: 'Uberlândia',
    type: String,
  })
  @IsString({ message: 'O campo search deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtro textual aplicado sobre o nome da hospedagem.',
    required: false,
    example: 'Novo Leste',
    type: String,
  })
  @IsString({ message: 'O campo name deve ser um texto.' })
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Filtro opcional pela cidade da hospedagem.',
    required: false,
    example: 'Uberlândia',
    type: String,
  })
  @IsString({ message: 'O campo city deve ser um texto.' })
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo estado da hospedagem.',
    required: false,
    example: 'Minas Gerais',
    type: String,
  })
  @IsString({ message: 'O campo state deve ser um texto.' })
  @IsOptional()
  state?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo identificador da categoria.',
    required: false,
    example: '3',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo categoryId deve conter apenas números.' })
  @IsOptional()
  categoryId?: number;

  @ApiProperty({
    description: 'Filtro opcional pelo identificador do dono da hospedagem.',
    required: false,
    example: '15',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo userId deve conter apenas números.' })
  @IsOptional()
  userId?: number;

  @ApiProperty({
    description: 'Filtro opcional por status ativo/inativo da hospedagem.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsString({ message: 'O campo isActive deve ser um texto.' })
  @IsOptional()
  isActive?: boolean | string;

  @ApiProperty({
    description: 'Quantidade de registros retornados por página.',
    required: false,
    example: '10',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo take deve conter apenas números.' })
  @IsOptional()
  take?: number;

  @ApiProperty({
    description:
      'Página atual da listagem paginada. Apesar do nome do campo ser `skip`, o valor esperado é o número da página.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo skip deve conter apenas números.' })
  @IsOptional()
  skip?: number;
}
