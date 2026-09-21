import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectBudgetDto {
  @ApiPropertyOptional({
    description:
      'Motivo da recusa, opcional. Serve ao prestador: sem ele a recusa chega ' +
      'como um "não" sem contexto.',
    example: 'Achei o prazo longo demais para o que preciso.',
  })
  @IsOptional()
  @IsString({ message: 'O motivo da recusa deve ser um texto.' })
  @MaxLength(2000, { message: 'O motivo da recusa deve ter no máximo 2000 caracteres.' })
  rejectReason?: string;
}
