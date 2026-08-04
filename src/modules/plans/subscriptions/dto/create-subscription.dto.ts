import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Id do plano a ser assinado.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id do plano deve ser um número inteiro.' })
  @Min(1)
  planId: number;

  @ApiPropertyOptional({
    description:
      'Email do pagador, usado para pré-preencher o checkout do Mercado Pago (opcional).',
    example: 'assinante@example.com',
    type: String,
  })
  @IsOptional()
  @IsEmail({}, { message: 'O email do pagador é inválido.' })
  payerEmail?: string;

  @ApiPropertyOptional({ description: 'Rua do endereço de cobrança.', example: 'Rua 123' })
  @IsOptional()
  @IsString({ message: 'A rua do endereço de cobrança deve ser um texto.' })
  billingStreet?: string;

  @ApiPropertyOptional({ description: 'Bairro do endereço de cobrança.', example: 'Centro' })
  @IsOptional()
  @IsString({ message: 'O bairro do endereço de cobrança deve ser um texto.' })
  billingNeighborhood?: string;

  @ApiPropertyOptional({ description: 'Cidade do endereço de cobrança.', example: 'São Paulo' })
  @IsOptional()
  @IsString({ message: 'A cidade do endereço de cobrança deve ser um texto.' })
  billingCity?: string;

  @ApiPropertyOptional({ description: 'Estado do endereço de cobrança.', example: 'SP' })
  @IsOptional()
  @IsString({ message: 'O estado do endereço de cobrança deve ser um texto.' })
  billingState?: string;

  @ApiPropertyOptional({ description: 'CEP do endereço de cobrança.', example: '15005-000' })
  @IsOptional()
  @IsString({ message: 'O CEP do endereço de cobrança deve ser um texto.' })
  billingZipCode?: string;
}
