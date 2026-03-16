import { ApiProperty } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ServiceType } from '../enums/service-type.enum';

export class QueryServiceDto {
  @ApiProperty({
    description: 'Filtro por trecho do nome do serviço.',
    required: false,
    example: 'consulta',
    type: String,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Filtro por id da categoria.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({
    description: 'Filtro por tipo do serviço.',
    enum: ServiceType,
    enumName: 'ServiceType',
    required: false,
    example: ServiceType.Online,
  })
  @IsEnum(ServiceType)
  @IsOptional()
  type?: ServiceType;

  @ApiProperty({
    description: 'Filtro por id do usuário dono do serviço.',
    required: false,
    example: '10',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  userId?: number;

  @ApiProperty({
    description: 'Filtro por status de ativação.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsBooleanString()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Quantidade de registros por página.',
    required: false,
    example: '10',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  take?: number;

  @ApiProperty({
    description: 'Página atual para cálculo de paginação.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  skip?: number;
}
