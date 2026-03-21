import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
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
    example: '1450.00',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O valor acordado deve ser um texto.' })
  agreedAmount?: string;

  @ApiPropertyOptional({
    description: 'Mensagem opcional enviada ao responder a negociação.',
    example: 'Posso seguir por esse valor.',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'A mensagem da resposta deve ser um texto.' })
  message?: string;
}
