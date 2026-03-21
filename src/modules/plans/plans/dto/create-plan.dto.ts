import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { SubscriptionIntervalEnum } from '../../enums/subscription-interval.enum';

export class CreatePlanDto {
  @ApiProperty({
    description: 'Nome de exibição do plano.',
    example: 'Plano mensal',
  })
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

  @ApiProperty({
    description: 'Preço cobrado pelo plano.',
    example: '39.90',
    type: String,
  })
  @IsString({ message: 'O preço do plano deve ser enviado como texto.' })
  price: string;

  @ApiProperty({
    description: 'Intervalo de renovação do plano.',
    enum: SubscriptionIntervalEnum,
    example: SubscriptionIntervalEnum.Month,
  })
  @IsEnum(SubscriptionIntervalEnum, { message: 'O intervalo do plano é inválido.' })
  interval: SubscriptionIntervalEnum;

  @ApiProperty({
    description: 'Quantidade de intervalos por ciclo de cobrança.',
    example: '1',
    type: String,
  })
  @IsString({ message: 'A quantidade de intervalos deve ser enviada como texto.' })
  intervalCount: string;

  @ApiPropertyOptional({
    description: 'Lista de benefícios incluídos no plano.',
    example: ['Benefício 1', 'Benefício 2'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Os benefícios devem ser enviados em lista.' })
  @IsString({ each: true, message: 'Cada benefício deve ser um texto.' })
  benefits?: string[];

  @ApiPropertyOptional({
    description: 'Indica se o plano está ativo para contratação.',
    example: 'true',
    type: String,
  })
  @IsOptional()
  @IsBooleanString({ message: 'O campo isActive deve ser true ou false.' })
  isActive?: string;

  @ApiPropertyOptional({
    description: 'Ordem de exibição do plano nas listagens.',
    example: '1',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'A ordem do plano deve ser enviada como texto.' })
  sortOrder?: string;
}
