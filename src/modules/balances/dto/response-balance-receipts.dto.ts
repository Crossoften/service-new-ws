import { ApiProperty } from '@nestjs/swagger';
import { ResponseBalanceReceiptItemDto } from './response-balance-receipt-item.dto';

export class ResponseBalanceReceiptsDto {
  @ApiProperty({
    description: 'Saldo líquido do mês atual do usuário autenticado.',
    example: '2000.00',
    type: String,
  })
  currentMonthBalance: string;

  @ApiProperty({
    description: 'Lista dos últimos recebimentos confirmados do fornecedor.',
    type: [ResponseBalanceReceiptItemDto],
  })
  recentReceipts: ResponseBalanceReceiptItemDto[];
}
