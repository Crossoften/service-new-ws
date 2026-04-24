import { ApiProperty } from '@nestjs/swagger';

export class ResponseDashboardCardsDto {
  @ApiProperty({ description: 'Total de usuários cadastrados.', example: 300, type: Number })
  totalUsers: number;

  @ApiProperty({ description: 'Total de serviços ativos.', example: 2000, type: Number })
  totalServices: number;

  @ApiProperty({
    description: 'Valor total em caixa (pagamentos recebidos).',
    example: 30000,
    type: Number,
  })
  totalCashValue: number;
}
