import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class PayWorkDto {
  @ApiPropertyOptional({
    description:
      'Email do pagador, usado para pré-preencher o checkout do Mercado Pago (opcional).',
    example: 'contratante@example.com',
    type: String,
  })
  @IsOptional()
  @IsEmail({}, { message: 'O email do pagador é inválido.' })
  payerEmail?: string;
}
