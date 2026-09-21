import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryPayoutMethodEnum } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDeliveryPayoutDto {
  @ApiProperty({ description: 'Entregador que recebeu o repasse.', example: 42 })
  @Type(() => Number)
  @IsInt({ message: 'O entregador deve ser informado.' })
  @Min(1)
  courierId: number;

  @ApiProperty({
    description: 'Por onde o dinheiro saiu.',
    enum: DeliveryPayoutMethodEnum,
    enumName: 'DeliveryPayoutMethodEnum',
    example: DeliveryPayoutMethodEnum.Pix,
  })
  @IsEnum(DeliveryPayoutMethodEnum, { message: 'O meio de repasse é inválido.' })
  method: DeliveryPayoutMethodEnum;

  @ApiPropertyOptional({
    description: 'Comprovante: end-to-end do Pix, número da TED.',
    maxLength: 191,
    example: 'E1234567820260921T1830',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  reference?: string;

  @ApiPropertyOptional({ description: 'Observação livre.', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Saldo que a tela mostrava ao admin. Quando informado, o repasse só é ' +
      'registrado se o saldo em aberto ainda for exatamente esse — protege contra ' +
      'uma entrega concluída entre carregar a tela e enviar o formulário. ' +
      'Recomendado sempre.',
    example: 120.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor esperado deve ser um número válido.' })
  @Min(0)
  expectedAmount?: number;
}
