import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({ description: 'Motivo do cancelamento.', example: 'Mudança de planos.' })
  @IsOptional()
  @IsString({ message: 'O motivo do cancelamento deve ser um texto.' })
  cancelReason?: string;
}
