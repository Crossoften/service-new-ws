import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsOptional } from 'class-validator';

export class ResponsePlatformSettingsDto {
  @ApiProperty({
    description: 'Taxa global de comissão paga aos influencers sobre a primeira adesão paga (%).',
    example: 10.0,
    type: Number,
  })
  influencerCommissionRate: number;

  @ApiProperty({ example: '2026-05-01T10:00:00.000Z', type: String })
  updatedAt: Date;
}

export class UpdatePlatformSettingsDto {
  @ApiProperty({
    description: 'Taxa global de comissão para influencers (0–100). Aplicada quando o influencer não tem taxa customizada.',
    required: false,
    example: 12.5,
    type: Number,
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsOptional()
  influencerCommissionRate?: number;
}
