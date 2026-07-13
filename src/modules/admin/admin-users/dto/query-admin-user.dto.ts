import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  BillingTypeEnum,
  Status,
  UserProfileType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryAdminUserDto {
  @ApiPropertyOptional({ description: 'Quantidade por página.', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ description: 'Página atual (1-based).', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  skip?: number;

  @ApiPropertyOptional({ description: 'Busca textual (nome, email, telefone, documento).' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Campo de ordenação.', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Direção da ordenação.', example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Status do usuário.', enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ description: 'Tipo de perfil.', enum: UserProfileType })
  @IsOptional()
  @IsEnum(UserProfileType)
  profileType?: UserProfileType;

  @ApiPropertyOptional({ description: 'Modelo de cobrança.', enum: BillingTypeEnum })
  @IsOptional()
  @IsEnum(BillingTypeEnum)
  billingType?: BillingTypeEnum;

  // ---- Endereço ----
  @ApiPropertyOptional({ description: 'Filtrar por cidade.' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado.' })
  @IsOptional()
  @IsString()
  state?: string;

  // ---- Indicações ----
  @ApiPropertyOptional({ description: 'Id do influencer que indicou o usuário.', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  referredByInfluencerId?: number;

  @ApiPropertyOptional({ description: 'Mínimo de indicações feitas pelo usuário (para influencers).', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minReferrals?: number;

  // ---- Serviço / profissão ----
  @ApiPropertyOptional({ description: 'Id da categoria de serviço prestado (profissão).', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  serviceCategoryId?: number;

  @ApiPropertyOptional({ description: 'Filtrar apenas quem presta algum serviço ativo.', example: 'true' })
  @IsOptional()
  @IsBooleanString()
  hasActiveService?: string;

  // ---- Assinatura ----
  @ApiPropertyOptional({ description: 'Filtrar apenas quem tem assinatura ativa.', example: 'true' })
  @IsOptional()
  @IsBooleanString()
  hasSubscription?: string;

  @ApiPropertyOptional({ description: 'Valor mínimo da assinatura ativa.', example: 29.9 })
  @IsOptional()
  @Type(() => Number)
  minSubscriptionAmount?: number;

  @ApiPropertyOptional({ description: 'Valor máximo da assinatura ativa.', example: 99.9 })
  @IsOptional()
  @Type(() => Number)
  maxSubscriptionAmount?: number;

  @ApiPropertyOptional({
    description: 'Retorna apenas usuários que já efetuaram pelo menos um pagamento.',
    example: true,
  })
  @IsOptional()
  @IsBooleanString()
  hasPaid?: string;

  @ApiPropertyOptional({
    description: 'Retorna apenas usuários que já receberam algum pagamento.',
    example: true,
  })
  @IsOptional()
  @IsBooleanString()
  hasReceivedPayment?: string
}