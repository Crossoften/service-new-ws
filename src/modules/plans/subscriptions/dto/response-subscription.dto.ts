import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodEnum } from 'src/modules/works/enums/payment-method.enum';
import { PaymentStatusEnum } from 'src/modules/works/enums/payment-status.enum';
import { SubscriptionIntervalEnum } from '../../enums/subscription-interval.enum';
import { SubscriptionStatusEnum } from '../../enums/subscription-status.enum';
import { ResponsePlanDto } from '../../plans/dto/response-plan.dto';

export class ResponseSubscriptionPaymentDto {
  @ApiProperty({ description: 'Identificador do pagamento.', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Método de pagamento utilizado.',
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.CreditCard,
  })
  method: PaymentMethodEnum;

  @ApiProperty({
    description: 'Status do pagamento.',
    enum: PaymentStatusEnum,
    example: PaymentStatusEnum.Paid,
  })
  status: PaymentStatusEnum;

  @ApiProperty({ description: 'Valor pago.', example: '39.90' })
  amount: string;

  @ApiPropertyOptional({ description: 'Nome do titular.', example: 'Paula Maria' })
  holderName?: string;

  @ApiPropertyOptional({ description: 'Bandeira do cartão.', example: 'Visa' })
  cardBrand?: string;

  @ApiPropertyOptional({ description: 'Últimos quatro dígitos do cartão.', example: '1111' })
  cardLast4?: string;

  @ApiPropertyOptional({
    description: 'Data em que o pagamento foi registrado.',
    example: '2026-03-20T12:00:00.000Z',
  })
  paidAt?: Date;
}

export class ResponseSubscriptionAddressDto {
  @ApiProperty({ description: 'Identificador do endereço.', example: 1 })
  id: number;

  @ApiPropertyOptional({ description: 'Rua do endereço.', example: 'Rua 123' })
  street?: string;

  @ApiPropertyOptional({ description: 'Bairro do endereço.', example: 'Centro' })
  neighborhood?: string;

  @ApiPropertyOptional({ description: 'Cidade do endereço.', example: 'São Paulo' })
  city?: string;

  @ApiPropertyOptional({ description: 'Estado do endereço.', example: 'SP' })
  state?: string;

  @ApiPropertyOptional({ description: 'CEP do endereço.', example: '15005-000' })
  zipCode?: string;
}

export class ResponseSubscriptionDto {
  @ApiProperty({ description: 'Identificador da assinatura.', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Status atual da assinatura.',
    enum: SubscriptionStatusEnum,
    example: SubscriptionStatusEnum.Active,
  })
  status: SubscriptionStatusEnum;

  @ApiProperty({ description: 'Valor cobrado na assinatura.', example: '39.90' })
  amount: string;

  @ApiProperty({ description: 'Nome do plano contratado.', example: 'Plano mensal' })
  planName: string;

  @ApiProperty({
    description: 'Intervalo da assinatura contratada.',
    enum: SubscriptionIntervalEnum,
    example: SubscriptionIntervalEnum.Month,
  })
  planInterval: SubscriptionIntervalEnum;

  @ApiProperty({ description: 'Quantidade de intervalos por ciclo.', example: 1 })
  intervalCount: number;

  @ApiProperty({ description: 'Detalhes do plano vinculado.', type: ResponsePlanDto })
  plan: ResponsePlanDto;

  @ApiPropertyOptional({
    description: 'Último pagamento associado à assinatura.',
    type: ResponseSubscriptionPaymentDto,
  })
  payment?: ResponseSubscriptionPaymentDto;

  @ApiPropertyOptional({
    description: 'Endereço de cobrança vinculado à assinatura.',
    type: ResponseSubscriptionAddressDto,
  })
  address?: ResponseSubscriptionAddressDto;

  @ApiPropertyOptional({
    description: 'Data de início da assinatura.',
    example: '2026-03-20T12:00:00.000Z',
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Início do período atual da assinatura.',
    example: '2026-03-20T12:00:00.000Z',
  })
  currentPeriodStart?: Date;

  @ApiPropertyOptional({
    description: 'Fim do período atual da assinatura.',
    example: '2026-04-20T12:00:00.000Z',
  })
  currentPeriodEnd?: Date;

  @ApiPropertyOptional({
    description: 'Data de cancelamento da assinatura, quando houver.',
    example: '2026-04-01T12:00:00.000Z',
  })
  cancelledAt?: Date;

  @ApiProperty({
    description: 'Data de criação da assinatura.',
    example: '2026-03-20T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização da assinatura.',
    example: '2026-03-20T12:00:00.000Z',
  })
  updatedAt: Date;
}

export class CreateSubscriptionResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Assinatura criada com sucesso. Finalize o pagamento para ativá-la.',
  })
  message: string;

  @ApiProperty({
    description: 'URL do checkout do Mercado Pago para o assinante concluir o pagamento.',
    example: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789',
    type: String,
  })
  checkoutUrl: string;

  @ApiProperty({
    description: 'Assinatura criada (status pendente até a confirmação do pagamento).',
    type: ResponseSubscriptionDto,
  })
  subscription: ResponseSubscriptionDto;
}

export class ResponseFindAllSubscriptionsDto {
  @ApiProperty({
    description: 'Lista de assinaturas do usuário.',
    type: [ResponseSubscriptionDto],
  })
  subscriptions: ResponseSubscriptionDto[];
}
