import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { BudgetScope } from '../enums/budget-scope.enum';
import { BudgetStatus } from '../enums/budget-status.enum';

export class QueryBudgetDto {
  @ApiProperty({
    description: 'Escopo da listagem.',
    enum: BudgetScope,
    enumName: 'BudgetScope',
    required: false,
    example: BudgetScope.Received,
  })
  @IsEnum(BudgetScope, { message: 'O escopo informado é inválido.' })
  @IsOptional()
  scope?: BudgetScope;

  @ApiProperty({
    description: 'Filtro por status do orçamento.',
    enum: BudgetStatus,
    enumName: 'BudgetStatus',
    required: false,
    example: BudgetStatus.Pending,
  })
  @IsEnum(BudgetStatus, { message: 'O status do orçamento é inválido.' })
  @IsOptional()
  status?: BudgetStatus;

  @ApiProperty({
    description: 'Filtro por id do serviço.',
    required: false,
    example: '3',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo serviceId deve conter apenas números.' })
  @IsOptional()
  serviceId?: number;

  @ApiProperty({
    description: 'Filtro textual por nome do cliente ou serviço.',
    required: false,
    example: 'Susana',
    type: String,
  })
  @IsString({ message: 'O termo de busca deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Quantidade de registros por página.',
    required: false,
    example: '10',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo take deve conter apenas números.' })
  @IsOptional()
  take?: number;

  @ApiProperty({
    description: 'Página atual para cálculo de paginação.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo skip deve conter apenas números.' })
  @IsOptional()
  skip?: number;
}
