import { ApiProperty } from '@nestjs/swagger';

export class ResponseMyReferralsSummaryDto {
  @ApiProperty({ required: false, nullable: true, example: 'joaocarlos', type: String })
  referralCode?: string;

  @ApiProperty({ description: 'Total de usuários indicados.', example: 100, type: Number })
  totalReferrals: number;

  @ApiProperty({
    description: 'Total de indicados que realizaram pagamentos na plataforma.',
    example: 90,
    type: Number,
  })
  totalPaying: number;

  @ApiProperty({ description: 'Comissão acumulada em reais.', example: 500.0, type: Number })
  accumulatedCommission: number;

  @ApiProperty({
    description: 'Posição no ranking geral de influencers.',
    example: 24,
    type: Number,
  })
  rankingPosition: number;

  @ApiProperty({
    description: 'Taxa de comissão exclusiva deste influencer (%). Null = usa a taxa global.',
    required: false,
    nullable: true,
    example: 15.5,
    type: Number,
  })
  commissionRate: number | null;

  @ApiProperty({
    description:
      'Taxa de comissão efetiva aplicada: customizada se definida, caso contrário a global.',
    example: 15.5,
    type: Number,
  })
  effectiveCommissionRate: number;
}
