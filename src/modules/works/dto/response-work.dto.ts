import { ApiProperty } from '@nestjs/swagger';
import { ExtraRequestStatus, WarrantyRequestStatus } from '@prisma/client';
import { PaymentMethodEnum } from '../enums/payment-method.enum';
import { PaymentStatusEnum } from '../enums/payment-status.enum';
import { WorkStatusEnum } from '../enums/work-status.enum';
import { ResponseWorkFileDto } from './response-work-file.dto';

export class ResponseWorkUserDto {
  @ApiProperty({
    description: 'Identificador único do usuário relacionado ao trabalho.',
    example: 10,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome completo do usuário relacionado ao trabalho.',
    example: 'Susana Vieira',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Email principal do usuário.',
    example: 'susana@email.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Telefone do usuário, quando disponível.',
    required: false,
    nullable: true,
    example: '+55 11 99999-9999',
    type: String,
  })
  phone?: string;

  @ApiProperty({
    description: 'URL pública da foto de perfil do usuário, quando cadastrada.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/users/profile.png',
    type: String,
  })
  fileUrl?: string;
}

export class ResponseWorkListUserDto {
  @ApiProperty({
    description: 'Identificador único do usuário relacionado ao trabalho.',
    example: 10,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome completo do usuário relacionado ao trabalho.',
    example: 'Susana Vieira',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'URL pública da foto de perfil do usuário, quando cadastrada.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/users/profile.png',
    type: String,
  })
  fileUrl?: string;
}

export class ResponseWorkServiceDto {
  @ApiProperty({
    description: 'Identificador do serviço vinculado ao trabalho.',
    example: 3,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome do serviço vinculado ao trabalho.',
    example: 'Consulta odontológica',
    type: String,
  })
  name: string;
}

export class ResponseWorkBudgetDto {
  @ApiProperty({
    description: 'Identificador do orçamento que originou o trabalho.',
    example: 1,
    type: Number,
  })
  id: number;
}

export class ResponseWorkChatDto {
  @ApiProperty({
    description: 'Identificador do chat associado ao trabalho.',
    example: 4,
    type: Number,
  })
  id: number;
}

export class ResponseWorkPaymentDto {
  @ApiProperty({ description: 'Identificador do pagamento.', example: 1, type: Number })
  id: number;

  @ApiProperty({
    description: 'Método de pagamento utilizado.',
    enum: PaymentMethodEnum,
    enumName: 'PaymentMethodEnum',
    example: PaymentMethodEnum.CreditCard,
  })
  method: PaymentMethodEnum;

  @ApiProperty({
    description: 'Status do pagamento.',
    enum: PaymentStatusEnum,
    enumName: 'PaymentStatusEnum',
    example: PaymentStatusEnum.Paid,
  })
  status: PaymentStatusEnum;

  @ApiProperty({
    description: 'Nome do titular do cartão, quando informado.',
    required: false,
    nullable: true,
    example: 'Lynna Rossy',
    type: String,
  })
  holderName?: string;

  @ApiProperty({
    description: 'Bandeira do cartão, quando informada.',
    required: false,
    nullable: true,
    example: 'VISA',
    type: String,
  })
  cardBrand?: string;

  @ApiProperty({
    description: 'Últimos quatro dígitos do cartão, quando aplicável.',
    required: false,
    nullable: true,
    example: '2354',
    type: String,
  })
  cardLast4?: string;

  @ApiProperty({ description: 'Valor pago em formato decimal.', example: '350.00', type: String })
  amount: string;

  @ApiProperty({
    description: 'Data e hora em que o pagamento foi registrado.',
    required: false,
    nullable: true,
    example: '2026-03-17T10:00:00.000Z',
    type: String,
  })
  paidAt?: Date;
}

export class ResponseWorkListItemDto {
  @ApiProperty({ description: 'Identificador único do trabalho.', example: 1, type: Number })
  id: number;

  @ApiProperty({
    description: 'Status atual do trabalho.',
    enum: WorkStatusEnum,
    enumName: 'WorkStatusEnum',
    example: WorkStatusEnum.InProgress,
  })
  status: WorkStatusEnum;

  @ApiProperty({
    description: 'Data planejada ou efetiva do serviço em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T14:00:00.000Z',
    type: String,
  })
  serviceDate?: Date;

  @ApiProperty({
    description: 'Data e hora em que o trabalho foi iniciado, em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  startedAt?: Date;

  @ApiProperty({
    description: 'Data e hora em que a chegada do fornecedor foi confirmada pelo cliente.',
    required: false,
    nullable: true,
    example: '2026-03-16T10:15:00.000Z',
    type: String,
  })
  arrivalConfirmedAt?: Date;

  @ApiProperty({
    description: 'Data e hora em que o trabalho foi finalizado, em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T18:00:00.000Z',
    type: String,
  })
  finishedAt?: Date;

  @ApiProperty({
    description: 'Data e hora em que o trabalho foi cancelado, em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T12:00:00.000Z',
    type: String,
  })
  cancelledAt?: Date;

  @ApiProperty({
    description: 'Data final da garantia do trabalho, quando houver garantia cadastrada.',
    required: false,
    nullable: true,
    example: '2026-06-16T23:59:59.000Z',
    type: String,
  })
  warrantyExpiresAt?: Date;

  @ApiProperty({
    description: 'Indica se o trabalho ainda está coberto por garantia na data atual.',
    example: true,
    type: Boolean,
  })
  isUnderWarranty: boolean;

  @ApiProperty({
    description: 'Status da solicitação de garantia, quando houver.',
    required: false,
    nullable: true,
    enum: WarrantyRequestStatus,
    enumName: 'WarrantyRequestStatus',
    example: WarrantyRequestStatus.Pending,
  })
  warrantyRequestStatus?: WarrantyRequestStatus;

  @ApiProperty({
    description: 'Data da solicitação de garantia.',
    required: false,
    nullable: true,
    example: '2026-03-20T10:00:00.000Z',
    type: String,
  })
  warrantyRequestedAt?: Date;

  @ApiProperty({
    description: 'Status do acréscimo solicitado no serviço, quando houver.',
    required: false,
    nullable: true,
    enum: ExtraRequestStatus,
    enumName: 'ExtraRequestStatus',
    example: ExtraRequestStatus.Pending,
  })
  extraRequestStatus?: ExtraRequestStatus;

  @ApiProperty({
    description: 'Resumo do chat associado ao trabalho, quando disponível.',
    required: false,
    nullable: true,
    type: ResponseWorkChatDto,
  })
  chat?: ResponseWorkChatDto;

  @ApiProperty({
    description: 'Valor principal do serviço armazenado como string decimal.',
    required: false,
    nullable: true,
    example: '350.00',
    type: String,
  })
  serviceValue?: string;

  @ApiProperty({
    description: 'Valor total do trabalho armazenado como string decimal.',
    required: false,
    nullable: true,
    example: '350.00',
    type: String,
  })
  totalValue?: string;

  @ApiProperty({
    description: 'Resumo do orçamento que originou o trabalho.',
    type: ResponseWorkBudgetDto,
  })
  budget: ResponseWorkBudgetDto;

  @ApiProperty({
    description: 'Resumo do serviço vinculado ao trabalho.',
    type: ResponseWorkServiceDto,
  })
  service: ResponseWorkServiceDto;

  @ApiProperty({
    description: 'Dados resumidos do cliente solicitante.',
    type: ResponseWorkListUserDto,
  })
  requester: ResponseWorkListUserDto;

  @ApiProperty({
    description: 'Dados resumidos do fornecedor responsável.',
    type: ResponseWorkListUserDto,
  })
  provider: ResponseWorkListUserDto;

  @ApiProperty({
    description: 'Data de criação do trabalho em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Resumo do pagamento do trabalho, quando já registrado.',
    required: false,
    nullable: true,
    type: ResponseWorkPaymentDto,
  })
  payment?: ResponseWorkPaymentDto;
}

export class ResponseWorkDto {
  @ApiProperty({ description: 'Identificador único do trabalho.', example: 1, type: Number })
  id: number;

  @ApiProperty({
    description: 'Status atual do trabalho.',
    enum: WorkStatusEnum,
    enumName: 'WorkStatusEnum',
    example: WorkStatusEnum.InProgress,
  })
  status: WorkStatusEnum;

  @ApiProperty({
    description:
      'Detalhes adicionais, instruções ou observações registradas para a execução do trabalho.',
    required: false,
    nullable: true,
    example: 'Executar serviço no período da tarde.',
    type: String,
  })
  details?: string;

  @ApiProperty({
    description: 'Descrição final preenchida na conclusão do trabalho.',
    required: false,
    nullable: true,
    example: 'Serviço concluído com sucesso.',
    type: String,
  })
  completionDescription?: string;

  @ApiProperty({
    description: 'Motivo do cancelamento do trabalho, quando aplicável.',
    required: false,
    nullable: true,
    example: 'Cliente desistiu.',
    type: String,
  })
  cancelReason?: string;

  @ApiProperty({
    description: 'Data planejada ou efetiva do serviço em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T14:00:00.000Z',
    type: String,
  })
  serviceDate?: Date;

  @ApiProperty({
    description: 'Data e hora em que o trabalho foi iniciado, em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  startedAt?: Date;

  @ApiProperty({
    description: 'Data e hora em que a chegada do fornecedor foi confirmada pelo cliente.',
    required: false,
    nullable: true,
    example: '2026-03-16T10:15:00.000Z',
    type: String,
  })
  arrivalConfirmedAt?: Date;

  @ApiProperty({
    description: 'Data e hora em que o trabalho foi finalizado, em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T18:00:00.000Z',
    type: String,
  })
  finishedAt?: Date;

  @ApiProperty({
    description: 'Data e hora em que o trabalho foi cancelado, em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T12:00:00.000Z',
    type: String,
  })
  cancelledAt?: Date;

  @ApiProperty({
    description: 'Data final da garantia do trabalho, quando houver garantia cadastrada.',
    required: false,
    nullable: true,
    example: '2026-06-16T23:59:59.000Z',
    type: String,
  })
  warrantyExpiresAt?: Date;

  @ApiProperty({
    description: 'Data da solicitação de garantia.',
    required: false,
    nullable: true,
    example: '2026-03-20T10:00:00.000Z',
    type: String,
  })
  warrantyRequestedAt?: Date;

  @ApiProperty({
    description: 'Descrição da solicitação de garantia, quando houver.',
    required: false,
    nullable: true,
    example: 'O serviço apresentou falha após dois dias de uso.',
    type: String,
  })
  warrantyRequestDescription?: string;

  @ApiProperty({
    description: 'Descrição da resposta da garantia, quando houver.',
    required: false,
    nullable: true,
    example: 'Solicitação aprovada. Vamos realizar o ajuste sem custo adicional.',
    type: String,
  })
  warrantyResponseDescription?: string;

  @ApiProperty({
    description: 'Data da resposta da garantia.',
    required: false,
    nullable: true,
    example: '2026-03-21T10:00:00.000Z',
    type: String,
  })
  warrantyRespondedAt?: Date;

  @ApiProperty({
    description: 'Status da solicitação de garantia, quando houver.',
    required: false,
    nullable: true,
    enum: WarrantyRequestStatus,
    enumName: 'WarrantyRequestStatus',
    example: WarrantyRequestStatus.Pending,
  })
  warrantyRequestStatus?: WarrantyRequestStatus;

  @ApiProperty({
    description: 'Valor adicional solicitado no serviço, quando houver.',
    required: false,
    nullable: true,
    example: '80.00',
    type: String,
  })
  extraRequestValue?: string;

  @ApiProperty({
    description: 'Justificativa do acréscimo solicitado no serviço.',
    required: false,
    nullable: true,
    example: 'Foi identificado um reparo adicional não previsto inicialmente.',
    type: String,
  })
  extraRequestDescription?: string;

  @ApiProperty({
    description: 'Status do acréscimo solicitado no serviço, quando houver.',
    required: false,
    nullable: true,
    enum: ExtraRequestStatus,
    enumName: 'ExtraRequestStatus',
    example: ExtraRequestStatus.Pending,
  })
  extraRequestStatus?: ExtraRequestStatus;

  @ApiProperty({
    description: 'Data em que o acréscimo foi solicitado.',
    required: false,
    nullable: true,
    example: '2026-03-18T10:00:00.000Z',
    type: String,
  })
  extraRequestedAt?: Date;

  @ApiProperty({
    description: 'Data em que o acréscimo foi respondido pelo cliente.',
    required: false,
    nullable: true,
    example: '2026-03-18T10:10:00.000Z',
    type: String,
  })
  extraRespondedAt?: Date;

  @ApiProperty({
    description: 'Indica se o trabalho ainda está coberto por garantia na data atual.',
    example: true,
    type: Boolean,
  })
  isUnderWarranty: boolean;

  @ApiProperty({
    description: 'Resumo do chat associado ao trabalho, quando disponível.',
    required: false,
    nullable: true,
    type: ResponseWorkChatDto,
  })
  chat?: ResponseWorkChatDto;

  @ApiProperty({
    description: 'Valor principal do serviço armazenado como string decimal.',
    required: false,
    nullable: true,
    example: '350.00',
    type: String,
  })
  serviceValue?: string;

  @ApiProperty({
    description: 'Valor total do trabalho armazenado como string decimal.',
    required: false,
    nullable: true,
    example: '350.00',
    type: String,
  })
  totalValue?: string;

  @ApiProperty({ description: 'Identificador do orçamento de origem.', example: 1, type: Number })
  budgetId: number;

  @ApiProperty({
    description: 'Resumo do orçamento que originou o trabalho.',
    type: ResponseWorkBudgetDto,
  })
  budget: ResponseWorkBudgetDto;

  @ApiProperty({
    description: 'Identificador do serviço vinculado ao trabalho.',
    example: 3,
    type: Number,
  })
  serviceId: number;

  @ApiProperty({
    description: 'Resumo do serviço vinculado ao trabalho.',
    type: ResponseWorkServiceDto,
  })
  service: ResponseWorkServiceDto;

  @ApiProperty({
    description: 'Identificador do cliente solicitante do trabalho.',
    example: 10,
    type: Number,
  })
  requesterId: number;

  @ApiProperty({
    description: 'Dados resumidos do cliente solicitante.',
    type: ResponseWorkUserDto,
  })
  requester: ResponseWorkUserDto;

  @ApiProperty({
    description: 'Identificador do fornecedor responsável pelo trabalho.',
    example: 20,
    type: Number,
  })
  providerId: number;

  @ApiProperty({
    description: 'Dados resumidos do fornecedor responsável.',
    type: ResponseWorkUserDto,
  })
  provider: ResponseWorkUserDto;

  @ApiProperty({
    description:
      'Lista de arquivos anexados ao trabalho, incluindo anexos do cliente, fornecedor, conclusão e garantia.',
    type: [ResponseWorkFileDto],
  })
  files: ResponseWorkFileDto[];

  @ApiProperty({
    description: 'Data de criação do trabalho em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do trabalho em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Dados do pagamento do trabalho, quando registrado.',
    required: false,
    nullable: true,
    type: ResponseWorkPaymentDto,
  })
  payment?: ResponseWorkPaymentDto;
}
