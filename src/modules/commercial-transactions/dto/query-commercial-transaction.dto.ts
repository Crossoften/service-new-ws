import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { CommercialTransactionParticipantRoleEnum } from '../enums/commercial-transaction-participant-role.enum';
import { CommercialTransactionStatusEnum } from '../enums/commercial-transaction-status.enum';

export class QueryCommercialTransactionDto {
  @ApiPropertyOptional({
    description: 'Filtro por status da negociação.',
    enum: CommercialTransactionStatusEnum,
    example: CommercialTransactionStatusEnum.Requested,
  })
  @IsOptional()
  @IsEnum(CommercialTransactionStatusEnum, { message: 'O status da negociação é inválido.' })
  status?: CommercialTransactionStatusEnum;

  @ApiPropertyOptional({
    description: 'Filtra negociações como comprador, vendedor ou ambas.',
    enum: CommercialTransactionParticipantRoleEnum,
    example: CommercialTransactionParticipantRoleEnum.All,
  })
  @IsOptional()
  @IsEnum(CommercialTransactionParticipantRoleEnum, {
    message: 'O papel do participante informado é inválido.',
  })
  participantRole?: CommercialTransactionParticipantRoleEnum;

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
