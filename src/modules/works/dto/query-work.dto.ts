import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { WorkScopeEnum } from '../enums/work-scope.enum';
import { WorkStatusEnum } from '../enums/work-status.enum';

export class QueryWorkDto {
  @ApiProperty({
    description: 'Escopo da listagem de trabalhos.',
    enum: WorkScopeEnum,
    enumName: 'WorkScopeEnum',
    required: false,
    example: WorkScopeEnum.Received,
  })
  @IsEnum(WorkScopeEnum, { message: 'O escopo informado é inválido.' })
  @IsOptional()
  scope?: WorkScopeEnum;

  @ApiProperty({
    description: 'Filtro opcional pelo status atual do trabalho.',
    enum: WorkStatusEnum,
    enumName: 'WorkStatusEnum',
    required: false,
    example: WorkStatusEnum.InProgress,
  })
  @IsEnum(WorkStatusEnum, { message: 'O status do trabalho é inválido.' })
  @IsOptional()
  status?: WorkStatusEnum;

  @ApiProperty({
    description: 'Filtro textual aplicado sobre nome do cliente, fornecedor ou serviço.',
    required: false,
    example: 'Susana',
  })
  @IsString({ message: 'O termo de busca deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo identificador do serviço vinculado ao trabalho.',
    required: false,
    example: 3,
  })
  @Type(() => Number)
  @IsInt({ message: 'O campo serviceId deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  serviceId?: number;

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
