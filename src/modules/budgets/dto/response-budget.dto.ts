import { ApiProperty } from '@nestjs/swagger';
import { BudgetStatus } from '../enums/budget-status.enum';
import { BudgetTimeUnit } from '../enums/budget-time-unit.enum';
import { ResponseBudgetFileDto } from './response-budget-file.dto';
import { ResponseBudgetInformationDto } from './response-budget-information.dto';

export class ResponseBudgetUserDto {
  @ApiProperty({ description: 'Identificador do usuário.', example: 10 })
  id: number;

  @ApiProperty({ description: 'Nome do usuário.', example: 'Susana Vieira' })
  name: string;

  @ApiProperty({ description: 'Email do usuário.', example: 'susana@email.com' })
  email: string;

  @ApiProperty({
    description: 'Telefone do usuário.',
    required: false,
    nullable: true,
    example: '+55 11 99999-9999',
  })
  phone?: string;

  @ApiProperty({
    description: 'Foto do usuário.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/users/profile.png',
  })
  fileUrl?: string;
}

export class ResponseBudgetServiceSummaryDto {
  @ApiProperty({ description: 'Identificador do serviço.', example: 3 })
  id: number;

  @ApiProperty({ description: 'Nome do serviço.', example: 'Consulta odontológica' })
  name: string;
}

export class ResponseBudgetDto {
  @ApiProperty({ description: 'Identificador do orçamento.', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Descrição inicial da solicitação.',
    required: false,
    nullable: true,
    example: 'Preciso de orçamento para atendimento em domicílio.',
  })
  description?: string;

  @ApiProperty({
    description: 'Status atual do orçamento.',
    enum: BudgetStatus,
    enumName: 'BudgetStatus',
    example: BudgetStatus.Pending,
  })
  status: BudgetStatus;

  @ApiProperty({
    description: 'Descrição da resposta do fornecedor.',
    required: false,
    nullable: true,
    example: 'Posso atender em até 3 dias úteis.',
  })
  responseDescription?: string;

  @ApiProperty({
    description: 'Valor respondido do orçamento.',
    required: false,
    nullable: true,
    example: '350.00',
  })
  responseValue?: string;

  @ApiProperty({
    description: 'Quantidade de tempo prevista.',
    required: false,
    nullable: true,
    example: 3,
  })
  responseTimeQuantity?: number;

  @ApiProperty({
    description: 'Unidade da previsão.',
    enum: BudgetTimeUnit,
    enumName: 'BudgetTimeUnit',
    required: false,
    nullable: true,
    example: BudgetTimeUnit.Day,
  })
  responseTimeUnit?: BudgetTimeUnit;

  @ApiProperty({ description: 'Id do serviço vinculado.', example: 3 })
  serviceId: number;

  @ApiProperty({ type: ResponseBudgetServiceSummaryDto })
  service: ResponseBudgetServiceSummaryDto;

  @ApiProperty({ description: 'Id do cliente solicitante.', example: 10 })
  requesterId: number;

  @ApiProperty({ type: ResponseBudgetUserDto })
  requester: ResponseBudgetUserDto;

  @ApiProperty({ description: 'Id do fornecedor responsável.', example: 20 })
  providerId: number;

  @ApiProperty({ type: ResponseBudgetUserDto })
  provider: ResponseBudgetUserDto;

  @ApiProperty({ type: [ResponseBudgetFileDto] })
  files: ResponseBudgetFileDto[];

  @ApiProperty({ type: [ResponseBudgetInformationDto] })
  informationRequests: ResponseBudgetInformationDto[];

  @ApiProperty({
    description: 'Data de criação do orçamento.',
    example: '2026-03-15T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do orçamento.',
    example: '2026-03-15T10:00:00.000Z',
  })
  updatedAt: Date;
}
