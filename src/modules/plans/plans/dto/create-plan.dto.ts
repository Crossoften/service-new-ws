import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SubscriptionIntervalEnum } from '../../enums/subscription-interval.enum';

export class CreatePlanDto {
  @ApiProperty({ description: 'Nome de exibição do plano.', example: 'Plano mensal' })
  @IsString({ message: 'O nome do plano deve ser um texto.' })
  name: string;

  @ApiProperty({
    description: 'Slug único usado para identificar o plano internamente.',
    example: 'plano-mensal',
  })
  @IsString({ message: 'O slug do plano deve ser um texto.' })
  slug: string;

  @ApiPropertyOptional({
    description: 'Descrição resumida do plano.',
    example: 'Acesso completo ao app por 1 mês.',
  })
  @IsOptional()
  @IsString({ message: 'A descrição do plano deve ser um texto.' })
  description?: string;

  @ApiProperty({ description: 'Preço cobrado pelo plano.', example: 39.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço do plano deve ser um número válido.' })
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Intervalo de renovação do plano.',
    enum: SubscriptionIntervalEnum,
    example: SubscriptionIntervalEnum.Month,
  })
  @IsEnum(SubscriptionIntervalEnum, { message: 'O intervalo do plano é inválido.' })
  interval: SubscriptionIntervalEnum;

  @ApiProperty({ description: 'Quantidade de intervalos por ciclo de cobrança.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'A quantidade de intervalos deve ser um número inteiro.' })
  @Min(1)
  intervalCount: number;

  @ApiPropertyOptional({ description: 'Meses bônus adicionados ao período do plano.', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Os meses bônus devem ser um número inteiro.' })
  @Min(0)
  bonusMonths?: number;

  @ApiPropertyOptional({
    description: 'Indica se o plano está ativo para contratação.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O campo isActive deve ser true ou false.' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Ordem de exibição do plano nas listagens.', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A ordem do plano deve ser um número inteiro.' })
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Id da categoria de serviço à qual o plano fica vinculado. Se omitido, o plano é global (vale para todas as profissões).',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A categoria deve ser um número inteiro.' })
  categoryId?: number;
}
