import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionIntervalEnum, SubscriptionStatusEnum } from '@prisma/client';

export class ProviderSubscriptionItemDto {
  @ApiProperty({ example: 12, type: Number })
  subscriptionId: number;

  @ApiProperty({ example: 2, type: Number })
  planId: number;

  @ApiProperty({ example: 'Plano Mensal', type: String })
  planName: string;

  @ApiProperty({ enum: SubscriptionIntervalEnum, enumName: 'SubscriptionIntervalEnum' })
  planInterval: SubscriptionIntervalEnum;

  @ApiProperty({ example: 1, type: Number })
  intervalCount: number;

  @ApiProperty({
    description: 'Valor cobrado. Zero nas concessões, porque nada foi cobrado.',
    example: 49.9,
    type: Number,
  })
  amount: number;

  @ApiProperty({ enum: SubscriptionStatusEnum, enumName: 'SubscriptionStatusEnum' })
  status: SubscriptionStatusEnum;

  @ApiPropertyOptional({
    description:
      'Categoria que esta assinatura cobre. Ausente significa cobertura ampla, ' +
      'o caso das concessões.',
    example: 4,
    type: Number,
  })
  categoryId?: number;

  @ApiPropertyOptional({ example: 'Pintura', type: String })
  categoryName?: string;

  @ApiProperty({
    description: 'Verdadeiro quando a assinatura foi concedida por um administrador.',
    example: false,
    type: Boolean,
  })
  isGranted: boolean;

  @ApiPropertyOptional({ description: 'Administrador que concedeu.', example: 1, type: Number })
  grantedById?: number;

  @ApiPropertyOptional({ example: 'Cortesia comercial', type: String })
  grantReason?: string;

  @ApiProperty({
    description: 'Total acumulado de meses bônus já concedidos a esta assinatura.',
    example: 3,
    type: Number,
  })
  bonusMonths: number;

  @ApiProperty({ example: false, type: Boolean })
  cancelAtPeriodEnd: boolean;

  @ApiPropertyOptional({ example: '2026-01-10T08:00:00.000Z', type: String })
  startedAt?: Date;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', type: String })
  currentPeriodStart?: Date;

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00.000Z', type: String })
  currentPeriodEnd?: Date;

  @ApiProperty({
    description:
      'Verdadeiro quando a assinatura está ativa e dentro da validade. É o mesmo ' +
      'critério que os guards aplicam, para a tela não ter de recalculá-lo.',
    example: true,
    type: Boolean,
  })
  isCurrent: boolean;

  @ApiProperty({ example: '2026-01-10T08:00:00.000Z', type: String })
  createdAt: Date;
}

export class ResponseAdminProviderSubscriptionsDto {
  @ApiProperty({ example: 7, type: Number })
  providerId: number;

  @ApiPropertyOptional({
    description:
      'Concessão vigente do fornecedor, quando houver. Ausente significa que a rota ' +
      'de concessão está liberada; preenchido significa que ela responderia 409 e que ' +
      'o caminho para estender a validade é a rota de bônus sobre este id.',
    example: 12,
    type: Number,
  })
  activeGrantId?: number;

  @ApiProperty({ type: [ProviderSubscriptionItemDto] })
  subscriptions: ProviderSubscriptionItemDto[];
}
