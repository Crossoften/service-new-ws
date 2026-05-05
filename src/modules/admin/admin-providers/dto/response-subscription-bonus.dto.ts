import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatusEnum } from '@prisma/client';

export class ResponseSubscriptionBonusDto {
  @ApiProperty({ example: 1, type: Number })
  subscriptionId: number;

  @ApiProperty({
    description: 'Total acumulado de meses bônus concedidos à assinatura.',
    example: 3,
    type: Number,
  })
  totalBonusMonths: number;

  @ApiProperty({
    description: 'Nova data de término efetiva da assinatura (incluindo bônus).',
    example: '2027-06-01T00:00:00.000Z',
    type: String,
  })
  currentPeriodEnd: Date;

  @ApiProperty({ enum: SubscriptionStatusEnum, enumName: 'SubscriptionStatusEnum' })
  status: SubscriptionStatusEnum;
}
