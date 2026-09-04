import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';

export class GrantSubscriptionDto {
  @ApiProperty({
    description: 'Plano concedido. Define nome, intervalo e periodicidade da assinatura.',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'O id do plano deve ser um número inteiro.' })
  @Min(1)
  planId: number;

  @ApiProperty({
    description: 'Duração da concessão, em meses, contada a partir de agora.',
    example: 12,
    minimum: 1,
    maximum: 120,
  })
  @Type(() => Number)
  @IsInt({ message: 'A duração deve ser um número inteiro de meses.' })
  @Min(1, { message: 'A concessão precisa durar ao menos 1 mês.' })
  // Teto para não gerar concessão vitalícia por engano de digitação — dez anos
  // já cobre qualquer acordo comercial plausível.
  @Max(120, { message: 'A concessão pode durar no máximo 120 meses.' })
  months: number;

  @ApiPropertyOptional({
    description:
      'Motivo da concessão, para auditoria. Ex.: "cortesia parceiro X", ' +
      '"ambiente de homologação", "compensação por indisponibilidade".',
    example: 'Conta de testes de homologação.',
  })
  @IsOptional()
  @IsString({ message: 'O motivo deve ser um texto.' })
  @MaxLength(255, { message: 'O motivo deve ter no máximo 255 caracteres.' })
  reason?: string;
}
