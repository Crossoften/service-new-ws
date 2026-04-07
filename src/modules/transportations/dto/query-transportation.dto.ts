import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryTransportationDto {
  @ApiProperty({ description: 'Busca textual.', required: false, example: 'Caminhão' })
  @IsString({ message: 'O campo search deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Filtro por nome.', required: false, example: 'Caminhão' })
  @IsString({ message: 'O campo name deve ser um texto.' })
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Filtro por categoria.', required: false, example: 3 })
  @Type(() => Number)
  @IsInt({ message: 'O campo categoryId deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @ApiProperty({ description: 'Filtro por usuário.', required: false, example: 15 })
  @Type(() => Number)
  @IsInt({ message: 'O campo userId deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  userId?: number;

  @ApiProperty({ description: 'Filtro por status ativo/inativo.', required: false, example: true })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O campo isActive deve ser true ou false.' })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Registros por página.', required: false, example: 10 })
  @Type(() => Number)
  @IsInt({ message: 'O campo take deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  take?: number;

  @ApiProperty({ description: 'Página atual.', required: false, example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O campo skip deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  skip?: number;
}
