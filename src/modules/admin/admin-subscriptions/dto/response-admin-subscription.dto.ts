import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionIntervalEnum, SubscriptionStatusEnum } from '@prisma/client';

export class AdminSubscriptionProviderDto {
  @ApiProperty({ example: 7, type: Number })
  id: number;

  @ApiProperty({ example: 'Marina Souza', type: String })
  name: string;

  @ApiProperty({ example: 'marina@email.com', type: String })
  email: string;

  @ApiPropertyOptional({ nullable: true, example: '+5534998701109', type: String })
  phone?: string;
}

export class AdminSubscriptionItemDto {
  @ApiProperty({ example: 12, type: Number })
  subscriptionId: number;

  @ApiProperty({ type: AdminSubscriptionProviderDto })
  provider: AdminSubscriptionProviderDto;

  @ApiProperty({ example: 'Plano Mensal', type: String })
  planName: string;

  @ApiProperty({ enum: SubscriptionIntervalEnum, enumName: 'SubscriptionIntervalEnum' })
  planInterval: SubscriptionIntervalEnum;

  @ApiProperty({
    description: 'Valor cobrado. Zero nas concessões, porque nada foi cobrado.',
    example: 0,
    type: Number,
  })
  amount: number;

  @ApiProperty({ enum: SubscriptionStatusEnum, enumName: 'SubscriptionStatusEnum' })
  status: SubscriptionStatusEnum;

  @ApiPropertyOptional({
    description: 'Categoria coberta. Ausente significa cobertura ampla, o caso das concessões.',
    example: 4,
    type: Number,
  })
  categoryId?: number;

  @ApiPropertyOptional({ example: 'Pintura', type: String })
  categoryName?: string;

  @ApiProperty({
    description: 'Verdadeiro quando um administrador concedeu, em vez de o fornecedor pagar.',
    example: true,
    type: Boolean,
  })
  isGranted: boolean;

  @ApiPropertyOptional({ description: 'Quem concedeu.', type: AdminSubscriptionProviderDto })
  grantedBy?: AdminSubscriptionProviderDto;

  @ApiPropertyOptional({ example: 'Conta de testes de homologação.', type: String })
  grantReason?: string;

  @ApiProperty({ example: 3, type: Number })
  bonusMonths: number;

  @ApiProperty({ example: false, type: Boolean })
  cancelAtPeriodEnd: boolean;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', type: String })
  currentPeriodStart?: Date;

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00.000Z', type: String })
  currentPeriodEnd?: Date;

  @ApiProperty({
    description:
      'Ativa e dentro da validade. É o mesmo critério que os guards aplicam, para a ' +
      'tela não ter de recalculá-lo.',
    example: true,
    type: Boolean,
  })
  isCurrent: boolean;

  @ApiProperty({ example: '2026-01-10T08:00:00.000Z', type: String })
  createdAt: Date;
}

export class ResponseFindAllAdminSubscriptionDto {
  @ApiProperty({ type: [AdminSubscriptionItemDto] })
  subscriptions: AdminSubscriptionItemDto[];

  @ApiProperty({ example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ example: 3, type: Number })
  totalPages: number;

  @ApiProperty({ example: 25, type: Number })
  totalRecords: number;
}
