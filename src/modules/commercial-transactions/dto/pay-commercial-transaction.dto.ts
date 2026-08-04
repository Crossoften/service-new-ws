import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class PayCommercialTransactionDto {
  @ApiPropertyOptional({
    description:
      'Email do pagador, usado para pré-preencher o checkout do Mercado Pago (opcional).',
    example: 'comprador@example.com',
    type: String,
  })
  @IsOptional()
  @IsEmail({}, { message: 'O email do pagador é inválido.' })
  payerEmail?: string;
}
