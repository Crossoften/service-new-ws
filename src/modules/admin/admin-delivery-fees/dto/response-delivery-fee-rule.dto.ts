import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryFeeTypeEnum } from '@prisma/client';

export class ResponseDeliveryFeeRuleDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ description: 'Início da faixa, em km.', example: '0.00' })
  minKm: string;

  @ApiPropertyOptional({ description: 'Fim da faixa, em km. Ausente = sem limite.' })
  maxKm?: string;

  @ApiProperty({ enum: DeliveryFeeTypeEnum })
  type: DeliveryFeeTypeEnum;

  @ApiProperty({ description: 'Reais quando Fixed, percentual quando Percent.', example: '8.00' })
  value: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
