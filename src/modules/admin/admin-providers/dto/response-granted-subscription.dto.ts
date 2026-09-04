import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatusEnum } from '@prisma/client';

export class ResponseGrantedSubscriptionDto {
  @ApiProperty()
  subscriptionId: number;

  @ApiProperty({ description: 'Fornecedor que recebeu a concessão.' })
  providerId: number;

  @ApiProperty({ example: 'Plano Mensal' })
  planName: string;

  @ApiProperty({ enum: SubscriptionStatusEnum, example: SubscriptionStatusEnum.Active })
  status: SubscriptionStatusEnum;

  @ApiProperty({ description: 'Até quando a assinatura concedida vale.' })
  currentPeriodEnd: Date;

  @ApiProperty({ description: 'Administrador que concedeu.' })
  grantedById: number;

  @ApiPropertyOptional()
  grantReason?: string;
}
