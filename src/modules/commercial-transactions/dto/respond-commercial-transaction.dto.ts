import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommercialTransactionStatus } from '../enums/commercial-transaction-status.enum';

export class RespondCommercialTransactionDto {
  @ApiProperty({
    description: 'Novo status da negociação.',
    enum: [CommercialTransactionStatus.Accepted, CommercialTransactionStatus.Rejected],
    example: CommercialTransactionStatus.Accepted,
  })
  @IsEnum(CommercialTransactionStatus)
  status: CommercialTransactionStatus;

  @ApiPropertyOptional({
    description: 'Valor acordado ao aceitar a negociação. Se omitido, usa o valor solicitado.',
    example: '1450.00',
    type: String,
  })
  @IsOptional()
  @IsString()
  agreedAmount?: string;

  @ApiPropertyOptional({
    description: 'Mensagem opcional enviada ao responder a negociação.',
    example: 'Posso seguir por esse valor.',
    type: String,
  })
  @IsOptional()
  @IsString()
  message?: string;
}
