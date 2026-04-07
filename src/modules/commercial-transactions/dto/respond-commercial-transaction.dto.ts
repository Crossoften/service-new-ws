import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CommercialTransactionStatusEnum } from '../enums/commercial-transaction-status.enum';

export class RespondCommercialTransactionDto {
  @ApiProperty({
    description: 'Novo status da negociação.',
    enum: [CommercialTransactionStatusEnum.Accepted, CommercialTransactionStatusEnum.Rejected],
    example: CommercialTransactionStatusEnum.Accepted,
  })
  @IsEnum(CommercialTransactionStatusEnum, { message: 'O status da resposta é inválido.' })
  status: CommercialTransactionStatusEnum;

  @ApiPropertyOptional({
    description: 'Valor acordado ao aceitar a negociação. Se omitido, usa o valor solicitado.',
    example: 1450.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor acordado deve ser um número válido.' })
  @Min(0)
  agreedAmount?: number;

  @ApiPropertyOptional({
    description: 'Mensagem opcional enviada ao responder a negociação.',
    example: 'Posso seguir por esse valor.',
  })
  @IsOptional()
  @IsString({ message: 'A mensagem da resposta deve ser um texto.' })
  message?: string;
}
