import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelFoodOrderDto {
  @ApiPropertyOptional({ description: 'Motivo do cancelamento.' })
  @IsOptional()
  @IsString({ message: 'O motivo do cancelamento deve ser um texto.' })
  cancelReason?: string;
}
