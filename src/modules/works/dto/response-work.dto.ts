import { ApiProperty } from '@nestjs/swagger';
import { WorkStatus } from '../enums/work-status.enum';
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

export class ResponseWorkListItemDto {
  @ApiProperty({ description: 'Identificador único do trabalho.', example: 1, type: Number })
  id: number;

  @ApiProperty({
    description: 'Status atual do trabalho.',
    enum: WorkStatus,
    enumName: 'WorkStatus',
    example: WorkStatus.InProgress,
  })
  status: WorkStatus;

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
}

export class ResponseWorkDto {
  @ApiProperty({ description: 'Identificador único do trabalho.', example: 1, type: Number })
  id: number;

  @ApiProperty({
    description: 'Status atual do trabalho.',
    enum: WorkStatus,
    enumName: 'WorkStatus',
    example: WorkStatus.InProgress,
  })
  status: WorkStatus;

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
      'Lista de arquivos anexados ao trabalho, incluindo anexos do cliente, fornecedor e conclusão.',
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
}
