import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from 'src/modules/works/enums/payment-method.enum';
import { ResponseBalanceServiceDto } from './response-balance-service.dto';
import { ResponseBalanceUserDto } from './response-balance-user.dto';

export class ResponseBalanceReceiptItemDto {
  @ApiProperty({
    description: 'Identificador da transação financeira de crédito.',
    example: 44,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Valor do recebimento formatado com duas casas decimais.',
    example: '350.00',
    type: String,
  })
  amount: string;

  @ApiProperty({
    description: 'Descrição resumida do recebimento para exibição no histórico.',
    example: 'Pagamento do trabalho #12',
    type: String,
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'Método utilizado no pagamento relacionado ao recebimento.',
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    example: PaymentMethod.CreditCard,
    nullable: true,
  })
  method?: PaymentMethod;

  @ApiProperty({
    description: 'Data em que o recebimento ficou disponível no saldo, em formato ISO 8601.',
    example: '2026-03-16T18:00:00.000Z',
    type: String,
    nullable: true,
  })
  availableAt?: Date;

  @ApiProperty({
    description: 'Data de criação do recebimento em formato ISO 8601.',
    example: '2026-03-16T17:45:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Resumo do cliente que originou o pagamento.',
    type: ResponseBalanceUserDto,
  })
  payer: ResponseBalanceUserDto;

  @ApiProperty({
    description: 'Resumo do serviço relacionado ao trabalho pago.',
    type: ResponseBalanceServiceDto,
    nullable: true,
  })
  service?: ResponseBalanceServiceDto;
}
