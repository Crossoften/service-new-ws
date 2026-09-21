import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryPayoutMethodEnum, PixKeyTypeEnum } from '@prisma/client';

export class ResponsePayoutBankAccountDto {
  @ApiProperty({ example: 'Nubank' })
  bankName: string;

  @ApiProperty({ example: 'Checking' })
  accountType: string;

  @ApiProperty({ example: '0001' })
  agency: string;

  @ApiProperty({ example: '12345678-9' })
  account: string;

  @ApiProperty({ example: '123.456.789-00' })
  cpf: string;

  @ApiPropertyOptional({
    description: 'Chave Pix, já normalizada. É por ela que o repasse é pago.',
    example: '+5534998701109',
  })
  pixKey?: string;

  @ApiPropertyOptional({ enum: PixKeyTypeEnum, enumName: 'PixKeyTypeEnum' })
  pixKeyType?: PixKeyTypeEnum;
}

export class ResponsePendingPayoutDto {
  @ApiProperty({ description: 'Entregador.', example: 42 })
  courierId: number;

  @ApiProperty({ example: 'Maria Souza' })
  courierName: string;

  @ApiPropertyOptional({ example: '+5534998701109' })
  courierPhone?: string;

  @ApiProperty({ description: 'Total devido, em reais.', example: '120.50', type: String })
  amount: string;

  @ApiProperty({ description: 'Entregas que compõem o saldo.', example: 12 })
  deliveries: number;

  @ApiProperty({ description: 'Data da entrega mais antiga ainda não repassada.' })
  oldestAt: Date;

  @ApiProperty({
    description:
      'Quantas dessas entregas pertencem a pedidos cujo pagamento foi estornado ou ' +
      'contestado depois de aprovado. Zero na grande maioria dos casos. Maior que ' +
      'zero significa que parte do saldo veio de dinheiro que voltou ao cliente — ' +
      'a plataforma não reverte nada sozinha, a decisão é do admin.',
    example: 0,
  })
  refundedDeliveries: number;

  @ApiProperty({
    description: 'Quanto do saldo vem de pedidos estornados, em reais.',
    example: '0.00',
    type: String,
  })
  refundedAmount: string;

  @ApiPropertyOptional({
    type: ResponsePayoutBankAccountDto,
    description:
      'Dados bancários cadastrados pelo entregador. Ausente quando ele ainda não ' +
      'cadastrou — nesse caso não há para onde enviar e o repasse fica esperando.',
  })
  bankAccount?: ResponsePayoutBankAccountDto;
}

export class ResponseDeliveryPayoutDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 42 })
  courierId: number;

  @ApiProperty({ example: 'Maria Souza' })
  courierName: string;

  @ApiProperty({ example: '120.50', type: String })
  amount: string;

  @ApiProperty({ enum: DeliveryPayoutMethodEnum, enumName: 'DeliveryPayoutMethodEnum' })
  method: DeliveryPayoutMethodEnum;

  @ApiPropertyOptional({ example: 'E1234567820260921T1830' })
  reference?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ description: 'Quantos créditos este lote quitou.', example: 12 })
  transactionsCount: number;

  @ApiProperty()
  paidAt: Date;

  @ApiProperty({ description: 'Admin que registrou.', example: 1 })
  createdById: number;

  @ApiProperty()
  createdAt: Date;
}
