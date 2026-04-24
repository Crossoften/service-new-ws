import { ApiProperty } from '@nestjs/swagger';

export class DashboardChartMonthDto {
  @ApiProperty({ description: 'Mês (1-12).', example: 1, type: Number })
  month: number;

  @ApiProperty({ description: 'Total de usuários cadastrados no mês.', example: 25, type: Number })
  users: number;

  @ApiProperty({ description: 'Total de serviços cadastrados no mês.', example: 80, type: Number })
  services: number;
}

export class ResponseDashboardChartDto {
  @ApiProperty({ description: 'Ano de referência dos dados.', example: 2026, type: Number })
  year: number;

  @ApiProperty({
    description: 'Dados mensais de usuários e serviços.',
    type: [DashboardChartMonthDto],
  })
  data: DashboardChartMonthDto[];
}
