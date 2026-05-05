import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddSubscriptionBonusDto {
  @ApiProperty({
    description: 'Quantidade de meses de bônus a adicionar à assinatura do fornecedor.',
    example: 2,
    type: Number,
  })
  @IsInt()
  @Min(1)
  months: number;
}
