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
  @IsEnum(BudgetScope)
  @IsOptional()
  scope?: BudgetScope;

  @ApiProperty({
    description: 'Filtro por status do orçamento.',
    enum: BudgetStatus,
    enumName: 'BudgetStatus',
    required: false,
    example: BudgetStatus.Pending,
  })
  @IsEnum(BudgetStatus)
  @IsOptional()
  status?: BudgetStatus;

  @ApiProperty({
    description: 'Filtro por id do serviço.',
    required: false,
    example: '3',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  serviceId?: number;

  @ApiProperty({
    description: 'Filtro textual por nome do cliente ou serviço.',
    required: false,
    example: 'Susana',
    type: String,
  })
  @IsString()
  @IsOptional()
  search?: string;

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
