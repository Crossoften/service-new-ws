import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { BudgetStatusEnum } from '../enums/budget-status.enum';
import { BudgetTimeUnitEnum } from '../enums/budget-time-unit.enum';
import { CreateBudgetDto } from './create-budget.dto';

export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {
  @ApiProperty({
    description: 'Status atual do orçamento.',
    enum: BudgetStatusEnum,
    enumName: 'BudgetStatusEnum',
    required: false,
    example: BudgetStatusEnum.Responded,
  })
  @IsEnum(BudgetStatusEnum, { message: 'O status do orçamento é inválido.' })
  @IsOptional()
  status?: BudgetStatusEnum;

  @ApiProperty({
    description: 'Descrição da resposta do fornecedor.',
    required: false,
    nullable: true,
    example: 'Consigo realizar o serviço em até 3 dias.',
    type: String,
  })
  @IsString({ message: 'A descrição da resposta deve ser um texto.' })
  @IsOptional()
  responseDescription?: string;

  @ApiProperty({
    description: 'Valor respondido para o orçamento.',
    required: false,
    example: '350.00',
    type: String,
  })
  @IsNumberString({}, { message: 'O valor da resposta deve conter apenas números.' })
  @IsOptional()
  responseValue?: string;

  @ApiProperty({
    description: 'Quantidade prevista para execução.',
    required: false,
    example: '3',
    type: String,
  })
  @IsNumberString({}, { message: 'A quantidade de tempo deve conter apenas números.' })
  @IsOptional()
  responseTimeQuantity?: number;

  @ApiProperty({
    description: 'Unidade de tempo da previsão.',
    enum: BudgetTimeUnitEnum,
    enumName: 'BudgetTimeUnitEnum',
    required: false,
    example: BudgetTimeUnitEnum.Day,
  })
  @IsEnum(BudgetTimeUnitEnum, { message: 'A unidade de tempo informada é inválida.' })
  @IsOptional()
  responseTimeUnit?: BudgetTimeUnitEnum;
}
