import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum RestaurantPayoutPeriodEnum {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export class QueryRestaurantPayoutDto {
  @ApiPropertyOptional({
    description:
      'Recorte do relatório. `day` começa à meia-noite de hoje, `week` no domingo desta ' +
      'semana e `month` no dia 1º deste mês — as mesmas fronteiras usadas nos ganhos do ' +
      'entregador. Ausente, o relatório considera todo o histórico, que é o comportamento ' +
      'anterior a este parâmetro.',
    enum: RestaurantPayoutPeriodEnum,
    example: RestaurantPayoutPeriodEnum.Month,
  })
  @IsOptional()
  @IsEnum(RestaurantPayoutPeriodEnum, {
    message: 'O período deve ser day, week ou month.',
  })
  period?: RestaurantPayoutPeriodEnum;
}
