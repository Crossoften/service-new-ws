import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommercialTransactionReferenceType } from '../enums/commercial-transaction-reference-type.enum';

export class CreateCommercialTransactionDto {
  @ApiProperty({
    description: 'Tipo de referência da negociação.',
    enum: CommercialTransactionReferenceType,
    example: CommercialTransactionReferenceType.Product,
  })
  @IsEnum(CommercialTransactionReferenceType, {
    message: 'O tipo de referência da negociação é inválido.',
  })
  referenceType: CommercialTransactionReferenceType;

  @ApiProperty({
    description: 'Id do item sendo negociado.',
    example: '1',
    type: String,
  })
  @IsString({ message: 'O id do item negociado deve ser um texto.' })
  referenceId: string;

  @ApiProperty({
    description: 'Valor solicitado para a negociação.',
    example: '1500.00',
    type: String,
  })
  @IsString({ message: 'O valor solicitado deve ser um texto.' })
  requestedAmount: string;

  @ApiPropertyOptional({
    description: 'Título opcional da solicitação.',
    example: 'Interesse no veículo',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O título da solicitação deve ser um texto.' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Mensagem inicial da negociação.',
    example: 'Tenho interesse e consigo pagar à vista.',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'A descrição da negociação deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Nome do arquivo enviado junto com a solicitação.',
    example: 'arquivo.pdf',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O nome do arquivo deve ser um texto.' })
  fileName?: string;

  @ApiPropertyOptional({
    description: 'URL do arquivo enviado junto com a solicitação.',
    example: 'https://cdn.example.com/arquivo.pdf',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'A URL do arquivo deve ser um texto.' })
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Chave de armazenamento do arquivo enviado junto com a solicitação.',
    example: 'commercial-transactions/arquivo.pdf',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'A chave do arquivo deve ser um texto.' })
  fileKey?: string;
}
