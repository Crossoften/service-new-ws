import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SubscriptionStatusEnum } from '@prisma/client';

/**
 * Origem da assinatura.
 *
 * A diferença importa para quem administra: `Granted` é cortesia ou ambiente de
 * teste, e não entrou dinheiro; `Paid` passou pelo provedor de pagamento. O
 * critério é `grantedById`, que só a concessão preenche.
 */
export enum SubscriptionOriginFilter {
  Granted = 'Granted',
  Paid = 'Paid',
}

export class QueryAdminSubscriptionDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou email do fornecedor.', example: 'Marina' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatusEnum, enumName: 'SubscriptionStatusEnum' })
  @IsEnum(SubscriptionStatusEnum)
  @IsOptional()
  status?: SubscriptionStatusEnum;

  @ApiPropertyOptional({
    description: 'Filtra por origem: concedida pelo admin ou paga pelo fornecedor.',
    enum: SubscriptionOriginFilter,
    enumName: 'SubscriptionOriginFilter',
  })
  @IsEnum(SubscriptionOriginFilter)
  @IsOptional()
  origin?: SubscriptionOriginFilter;

  @ApiPropertyOptional({ description: 'Restringe a um fornecedor.', example: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  providerId?: number;

  @ApiPropertyOptional({ description: 'Quantidade de registros por página.', example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  take?: number;

  @ApiPropertyOptional({ description: 'Página atual.', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  skip?: number;
}
