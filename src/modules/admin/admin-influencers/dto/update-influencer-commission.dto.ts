import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsOptional } from 'class-validator';

export class UpdateInfluencerCommissionDto {
  @ApiProperty({
    description:
      'Percentual de comissão exclusivo para este influencer (0–100). Envie null para remover o override e usar a taxa global.',
    required: false,
    nullable: true,
    example: 15.5,
    type: Number,
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsOptional()
  commissionRate?: number | null;
}
