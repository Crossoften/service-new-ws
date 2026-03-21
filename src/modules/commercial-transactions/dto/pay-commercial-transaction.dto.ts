import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethodEnum } from 'src/modules/works/enums/payment-method.enum';

export class PayCommercialTransactionDto {
  @ApiProperty({
    description: 'Método de pagamento utilizado.',
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.Pix,
  })
  @IsEnum(PaymentMethodEnum, { message: 'O método de pagamento informado é inválido.' })
  method: PaymentMethodEnum;

  @ApiPropertyOptional({
    description: 'Nome do titular do cartão, quando aplicável.',
    example: 'João Silva',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O nome do titular deve ser um texto.' })
  holderName?: string;

  @ApiPropertyOptional({
    description: 'Bandeira do cartão, quando aplicável.',
    example: 'Visa',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'A bandeira do cartão deve ser um texto.' })
  cardBrand?: string;

  @ApiPropertyOptional({
    description: 'Número do cartão para extração dos últimos 4 dígitos, quando aplicável.',
    example: '4111 1111 1111 1111',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O número do cartão deve ser um texto.' })
  cardNumber?: string;
}
