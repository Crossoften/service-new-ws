import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { CommercialTransactionParticipantRole } from '../enums/commercial-transaction-participant-role.enum';
import { CommercialTransactionStatus } from '../enums/commercial-transaction-status.enum';

export class QueryCommercialTransactionDto {
  @ApiPropertyOptional({
    description: 'Filtro por status da negociação.',
    enum: CommercialTransactionStatus,
    example: CommercialTransactionStatus.Requested,
  })
  @IsOptional()
  @IsEnum(CommercialTransactionStatus)
  status?: CommercialTransactionStatus;

  @ApiPropertyOptional({
    description: 'Filtra negociações como comprador, vendedor ou ambas.',
    enum: CommercialTransactionParticipantRole,
    example: CommercialTransactionParticipantRole.All,
  })
  @IsOptional()
  @IsEnum(CommercialTransactionParticipantRole)
  participantRole?: CommercialTransactionParticipantRole;

  @ApiPropertyOptional({
    description: 'Busca textual por título, descrição, nome do produto ou contraparte.',
    example: 'Fiat',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página.',
    example: '10',
    type: String,
  })
  @IsOptional()
  @IsNumberString()
  take?: string;

  @ApiPropertyOptional({
    description: 'Página atual da listagem.',
    example: '1',
    type: String,
  })
  @IsOptional()
  @IsNumberString()
  skip?: string;
}
