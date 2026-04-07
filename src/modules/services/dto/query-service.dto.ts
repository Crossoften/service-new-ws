import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ServiceTypeEnum } from '../enums/service-type.enum';

export class QueryServiceDto {
  @ApiProperty({
    description: 'Busca textual por nome do serviço, categoria ou nome do prestador.',
    required: false,
    example: 'consulta',
  })
  @IsString({ message: 'O campo search deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtro por trecho do nome do serviço.',
    required: false,
    example: 'consulta',
  })
  @IsString({ message: 'O campo name deve ser um texto.' })
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Filtro por id da categoria.', required: false, example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O campo categoryId deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @ApiProperty({
    description: 'Filtro por tipo do serviço.',
    enum: ServiceTypeEnum,
    enumName: 'ServiceTypeEnum',
    required: false,
    example: ServiceTypeEnum.Online,
  })
  @IsEnum(ServiceTypeEnum, { message: 'O tipo de serviço informado é inválido.' })
  @IsOptional()
  type?: ServiceTypeEnum;

  @ApiProperty({ description: 'Filtro por id do usuário dono do serviço.', required: false, example: 10 })
  @Type(() => Number)
  @IsInt({ message: 'O campo userId deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  userId?: number;

  @ApiProperty({ description: 'Filtro por status de ativação.', required: false, example: true })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O campo isActive deve ser true ou false.' })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Quantidade de registros por página.', required: false, example: 10 })
  @Type(() => Number)
  @IsInt({ message: 'O campo take deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  take?: number;

  @ApiProperty({ description: 'Página atual para cálculo de paginação.', required: false, example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O campo skip deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  skip?: number;
}
