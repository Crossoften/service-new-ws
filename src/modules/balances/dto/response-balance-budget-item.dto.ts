import { ApiProperty } from '@nestjs/swagger';
import { BudgetStatusEnum } from 'src/modules/budgets/enums/budget-status.enum';
import { ResponseBalanceServiceDto } from './response-balance-service.dto';
import { ResponseBalanceUserDto } from './response-balance-user.dto';

export class ResponseBalanceBudgetItemDto {
  @ApiProperty({
    description: 'Identificador do orçamento.',
    example: 91,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Descrição enviada na solicitação do orçamento.',
    example: 'Preciso de reparo no telhado da garagem.',
    type: String,
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'Status atual do orçamento.',
    enum: BudgetStatusEnum,
    enumName: 'BudgetStatusEnum',
    example: BudgetStatusEnum.Pending,
  })
  status: BudgetStatusEnum;

  @ApiProperty({
    description: 'Data de criação do orçamento em formato ISO 8601.',
    example: '2026-03-16T15:20:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Resumo do cliente que solicitou o orçamento.',
    type: ResponseBalanceUserDto,
  })
  requester: ResponseBalanceUserDto;

  @ApiProperty({
    description: 'Resumo do serviço relacionado ao orçamento.',
    type: ResponseBalanceServiceDto,
  })
  service: ResponseBalanceServiceDto;
}
