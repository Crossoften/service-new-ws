import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BudgetScopeEnum } from '../enums/budget-scope.enum';
import { BudgetStatusEnum } from '../enums/budget-status.enum';

export class QueryBudgetDto {
  @ApiProperty({
    description: 'Escopo da listagem.',
    enum: BudgetScopeEnum,
    enumName: 'BudgetScopeEnum',
    required: false,
    example: BudgetScopeEnum.Received,
  })
  @IsEnum(BudgetScopeEnum, { message: 'O escopo informado é inválido.' })
  @IsOptional()
  scope?: BudgetScopeEnum;

  @ApiProperty({
    description: 'Filtro por status do orçamento.',
    enum: BudgetStatusEnum,
    enumName: 'BudgetStatusEnum',
    required: false,
    example: BudgetStatusEnum.Pending,
  })
  @IsEnum(BudgetStatusEnum, { message: 'O status do orçamento é inválido.' })
  @IsOptional()
  status?: BudgetStatusEnum;

  @ApiProperty({ description: 'Filtro por id do serviço.', required: false, example: 3 })
  @Type(() => Number)
  @IsInt({ message: 'O campo serviceId deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  serviceId?: number;

  @ApiProperty({ description: 'Filtro textual por nome do cliente ou serviço.', required: false, example: 'Susana' })
  @IsString({ message: 'O termo de busca deve ser um texto.' })
  @IsOptional()
  search?: string;

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
