import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommercialTransactionReferenceTypeEnum } from '../enums/commercial-transaction-reference-type.enum';
import { CommercialTransactionStatusEnum } from '../enums/commercial-transaction-status.enum';
import { PaymentMethodEnum } from 'src/modules/works/enums/payment-method.enum';
import { PaymentStatusEnum } from 'src/modules/works/enums/payment-status.enum';

export class ResponseCommercialTransactionUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  fileUrl?: string;
}

export class ResponseCommercialTransactionProductDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  model?: string;

  @ApiProperty()
  price: string;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class ResponseCommercialTransactionPaymentDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: PaymentMethodEnum })
  method: PaymentMethodEnum;

  @ApiProperty({ enum: PaymentStatusEnum })
  status: PaymentStatusEnum;

  @ApiProperty()
  amount: string;

  @ApiPropertyOptional()
  holderName?: string;

  @ApiPropertyOptional()
  cardBrand?: string;

  @ApiPropertyOptional()
  cardLast4?: string;

  @ApiPropertyOptional()
  paidAt?: Date;
}

export class ResponseCommercialTransactionDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: CommercialTransactionReferenceTypeEnum })
  referenceType: CommercialTransactionReferenceTypeEnum;

  @ApiProperty()
  referenceId: number;

  @ApiProperty({ enum: CommercialTransactionStatusEnum })
  status: CommercialTransactionStatusEnum;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  requestedAmount: string;

  @ApiPropertyOptional()
  agreedAmount?: string;

  @ApiProperty()
  chatRoomId: number;

  @ApiProperty({ type: ResponseCommercialTransactionUserDto })
  buyer: ResponseCommercialTransactionUserDto;

  @ApiProperty({ type: ResponseCommercialTransactionUserDto })
  seller: ResponseCommercialTransactionUserDto;

  @ApiPropertyOptional({ type: ResponseCommercialTransactionProductDto })
  product?: ResponseCommercialTransactionProductDto;

  @ApiPropertyOptional({ type: ResponseCommercialTransactionPaymentDto })
  payment?: ResponseCommercialTransactionPaymentDto;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  paidAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateCommercialTransactionResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseCommercialTransactionDto })
  transaction: ResponseCommercialTransactionDto;
}

export class PayCommercialTransactionResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação da geração do checkout de pagamento.',
    example: 'Checkout de pagamento gerado com sucesso.',
  })
  message: string;

  @ApiProperty({
    description: 'URL do checkout do Mercado Pago para o comprador concluir o pagamento.',
    example: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789',
  })
  checkoutUrl: string;

  @ApiProperty({
    description: 'Negociação (status pendente até a confirmação do pagamento).',
    type: ResponseCommercialTransactionDto,
  })
  transaction: ResponseCommercialTransactionDto;
}

export class ResponseFindAllCommercialTransactionDto {
  @ApiProperty({ type: [ResponseCommercialTransactionDto] })
  transactions: ResponseCommercialTransactionDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
