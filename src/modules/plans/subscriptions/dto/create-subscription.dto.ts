import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethodEnum } from 'src/modules/works/enums/payment-method.enum';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Id do plano a ser assinado.',
    example: '1',
    type: String,
  })
  @IsString({ message: 'O id do plano deve ser enviado como texto.' })
  planId: string;

  @ApiProperty({
    description: 'Método de pagamento utilizado na assinatura.',
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.CreditCard,
  })
  @IsEnum(PaymentMethodEnum, { message: 'O método de pagamento informado é inválido.' })
  method: PaymentMethodEnum;

  @ApiPropertyOptional({
    description: 'Nome do titular do cartão ou da conta pagadora.',
    example: 'Paula Maria',
  })
  @IsOptional()
  @IsString({ message: 'O nome do titular deve ser um texto.' })
  holderName?: string;

  @ApiPropertyOptional({
    description: 'Bandeira do cartão utilizado no pagamento.',
    example: 'Visa',
  })
  @IsOptional()
  @IsString({ message: 'A bandeira do cartão deve ser um texto.' })
  cardBrand?: string;

  @ApiPropertyOptional({
    description: 'Número do cartão usado para extrair os últimos quatro dígitos.',
    example: '4111 1111 1111 1111',
  })
  @IsOptional()
  @IsString({ message: 'O número do cartão deve ser um texto.' })
  cardNumber?: string;

  @ApiPropertyOptional({
    description: 'Rua do endereço de cobrança.',
    example: 'Rua 123',
  })
  @IsOptional()
  @IsString({ message: 'A rua do endereço de cobrança deve ser um texto.' })
  billingStreet?: string;

  @ApiPropertyOptional({
    description: 'Bairro do endereço de cobrança.',
    example: 'Centro',
  })
  @IsOptional()
  @IsString({ message: 'O bairro do endereço de cobrança deve ser um texto.' })
  billingNeighborhood?: string;

  @ApiPropertyOptional({
    description: 'Cidade do endereço de cobrança.',
    example: 'São Paulo',
  })
  @IsOptional()
  @IsString({ message: 'A cidade do endereço de cobrança deve ser um texto.' })
  billingCity?: string;

  @ApiPropertyOptional({
    description: 'Estado do endereço de cobrança.',
    example: 'SP',
  })
  @IsOptional()
  @IsString({ message: 'O estado do endereço de cobrança deve ser um texto.' })
  billingState?: string;

  @ApiPropertyOptional({
    description: 'CEP do endereço de cobrança.',
    example: '15005-000',
  })
  @IsOptional()
  @IsString({ message: 'O CEP do endereço de cobrança deve ser um texto.' })
  billingZipCode?: string;
}
