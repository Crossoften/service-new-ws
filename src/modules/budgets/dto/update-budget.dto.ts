import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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
  })
  @IsString({ message: 'A descrição da resposta deve ser um texto.' })
  @IsOptional()
  responseDescription?: string;

  @ApiProperty({
    description: 'Valor respondido para o orçamento.',
    required: false,
    example: 350.0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor da resposta deve ser um número válido.' })
  @Min(0)
  @IsOptional()
  responseValue?: number;

  @ApiProperty({ description: 'Quantidade prevista para execução.', required: false, example: 3 })
  @Type(() => Number)
  @IsInt({ message: 'A quantidade de tempo deve ser um número inteiro.' })
  @Min(1)
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
