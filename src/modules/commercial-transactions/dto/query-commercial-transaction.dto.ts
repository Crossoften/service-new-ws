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
  @IsEnum(CommercialTransactionStatus, { message: 'O status da negociação é inválido.' })
  status?: CommercialTransactionStatus;

  @ApiPropertyOptional({
    description: 'Filtra negociações como comprador, vendedor ou ambas.',
    enum: CommercialTransactionParticipantRole,
    example: CommercialTransactionParticipantRole.All,
  })
  @IsOptional()
  @IsEnum(CommercialTransactionParticipantRole, {
    message: 'O papel do participante informado é inválido.',
  })
  participantRole?: CommercialTransactionParticipantRole;

  @ApiPropertyOptional({
    description: 'Busca textual por título, descrição, nome do produto ou contraparte.',
    example: 'Fiat',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O termo de busca deve ser um texto.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página.',
    example: '10',
    type: String,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'O campo take deve conter apenas números.' })
  take?: string;

  @ApiPropertyOptional({
    description: 'Página atual da listagem.',
    example: '1',
    type: String,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'O campo skip deve conter apenas números.' })
  skip?: string;
}
