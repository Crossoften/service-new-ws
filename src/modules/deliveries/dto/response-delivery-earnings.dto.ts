import { ApiProperty } from '@nestjs/swagger';

export class ResponseDeliveryEarningsPeriodDto {
  @ApiProperty({
    description: 'Soma dos repasses no período, em reais.',
    example: '185.00',
    type: String,
  })
  amount: string;

  @ApiProperty({ description: 'Entregas concluídas no período.', example: 12 })
  deliveries: number;
}

export class ResponseDeliveryEarningsDto {
  @ApiProperty({ type: ResponseDeliveryEarningsPeriodDto, description: 'Hoje, desde 00:00.' })
  day: ResponseDeliveryEarningsPeriodDto;

  @ApiProperty({
    type: ResponseDeliveryEarningsPeriodDto,
    description: 'Semana corrente, a partir de domingo.',
  })
  week: ResponseDeliveryEarningsPeriodDto;

  @ApiProperty({
    type: ResponseDeliveryEarningsPeriodDto,
    description: 'Mês corrente, a partir do dia 1.',
  })
  month: ResponseDeliveryEarningsPeriodDto;

  @ApiProperty({
    type: ResponseDeliveryEarningsPeriodDto,
    description: 'Acumulado desde o cadastro.',
  })
  total: ResponseDeliveryEarningsPeriodDto;
}
