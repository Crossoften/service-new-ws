import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { BudgetStatus } from '../enums/budget-status.enum';
import { BudgetTimeUnit } from '../enums/budget-time-unit.enum';
import { CreateBudgetDto } from './create-budget.dto';

export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {
  @ApiProperty({
    description: 'Status atual do orçamento.',
    enum: BudgetStatus,
    enumName: 'BudgetStatus',
    required: false,
    example: BudgetStatus.Responded,
  })
  @IsEnum(BudgetStatus)
  @IsOptional()
  status?: BudgetStatus;

  @ApiProperty({
    description: 'Descrição da resposta do fornecedor.',
    required: false,
    nullable: true,
    example: 'Consigo realizar o serviço em até 3 dias.',
    type: String,
  })
  @IsString()
  @IsOptional()
  responseDescription?: string;

  @ApiProperty({
    description: 'Valor respondido para o orçamento.',
    required: false,
    example: '350.00',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  responseValue?: string;

  @ApiProperty({
    description: 'Quantidade prevista para execução.',
    required: false,
    example: '3',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  responseTimeQuantity?: number;

  @ApiProperty({
    description: 'Unidade de tempo da previsão.',
    enum: BudgetTimeUnit,
    enumName: 'BudgetTimeUnit',
    required: false,
    example: BudgetTimeUnit.Day,
  })
  @IsEnum(BudgetTimeUnit)
  @IsOptional()
  responseTimeUnit?: BudgetTimeUnit;
}
