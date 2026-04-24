import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';

class InfluencerStatsDto {
  @ApiProperty({ description: 'Total de usuários indicados (downloads).', example: 100, type: Number })
  totalReferrals: number;

  @ApiProperty({ description: 'Total de indicados que realizaram pagamentos na plataforma.', example: 90, type: Number })
  totalPaying: number;

  @ApiProperty({ description: 'Comissão acumulada em reais.', example: 500.0, type: Number })
  accumulatedCommission: number;

  @ApiProperty({ description: 'Posição no ranking geral de influencers.', example: 24, type: Number })
  rankingPosition: number;
}

export class ResponseAdminInfluencerDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'João Carlos', type: String })
  name: string;

  @ApiProperty({ example: 'joao@email.com', type: String })
  email: string;

  @ApiProperty({ required: false, nullable: true, example: '(34) 9 9290-0000', type: String })
  phone?: string;

  @ApiProperty({ required: false, nullable: true, example: '123.456.789-10', type: String })
  document?: string;

  @ApiProperty({ required: false, nullable: true, example: 'https://cdn.example.com/photo.png', type: String })
  fileUrl?: string;

  @ApiProperty({ required: false, nullable: true, example: 'joaocarlos', type: String })
  referralCode?: string;

  @ApiProperty({ enum: Status, enumName: 'Status', example: Status.Active })
  status: Status;

  @ApiProperty({ description: 'Total de indicações ativas (pagantes).', example: 2, type: Number })
  activeReferrals: number;

  @ApiProperty({ type: InfluencerStatsDto })
  stats: InfluencerStatsDto;

  @ApiProperty({ example: '2026-03-16T10:00:00.000Z', type: String })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-16T10:00:00.000Z', type: String })
  updatedAt: Date;
}
