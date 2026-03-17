import { ApiProperty } from '@nestjs/swagger';
import { ResponseBalanceBudgetItemDto } from './response-balance-budget-item.dto';

export class ResponseBalanceOverviewDto {
  @ApiProperty({
    description: 'Saldo líquido do mês atual do usuário autenticado.',
    example: '2000.00',
    type: String,
  })
  currentMonthBalance: string;

  @ApiProperty({
    description: 'Lista dos últimos orçamentos recebidos pelo fornecedor.',
    type: [ResponseBalanceBudgetItemDto],
  })
  recentBudgets: ResponseBalanceBudgetItemDto[];
}
