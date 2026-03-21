import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethodEnum } from '../enums/payment-method.enum';

export class PayWorkDto {
  @ApiProperty({
    description: 'Método de pagamento escolhido para quitar o trabalho.',
    enum: PaymentMethodEnum,
    enumName: 'PaymentMethodEnum',
    example: PaymentMethodEnum.CreditCard,
  })
  @IsEnum(PaymentMethodEnum, { message: 'O método de pagamento informado é inválido.' })
  method: PaymentMethodEnum;

  @ApiProperty({
    description: 'Nome completo do titular do cartão, quando o método exigir cartão.',
    required: false,
    nullable: true,
    example: 'Lynna Rossy',
    type: String,
  })
  @IsString({ message: 'O nome do titular deve ser um texto.' })
  @IsOptional()
  @MaxLength(160, { message: 'O nome do titular deve ter no máximo 160 caracteres.' })
  holderName?: string;

  @ApiProperty({
    description: 'Bandeira do cartão, quando informada pela interface.',
    required: false,
    nullable: true,
    example: 'VISA',
    type: String,
  })
  @IsString({ message: 'A bandeira do cartão deve ser um texto.' })
  @IsOptional()
  @MaxLength(60, { message: 'A bandeira do cartão deve ter no máximo 60 caracteres.' })
  cardBrand?: string;

  @ApiProperty({
    description:
      'Número do cartão usado apenas para extrair os 4 últimos dígitos. O valor completo não é persistido.',
    required: false,
    nullable: true,
    example: '2421572879112354',
    type: String,
  })
  @IsString({ message: 'O número do cartão deve ser um texto.' })
  @IsOptional()
  @IsNotEmpty({ message: 'O número do cartão não pode ser vazio.' })
  cardNumber?: string;
}
