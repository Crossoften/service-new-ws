import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CommercialTransactionReferenceTypeEnum } from '../enums/commercial-transaction-reference-type.enum';

export class CreateCommercialTransactionDto {
  @ApiProperty({
    description: 'Tipo de referência da negociação.',
    enum: CommercialTransactionReferenceTypeEnum,
    example: CommercialTransactionReferenceTypeEnum.Product,
  })
  @IsEnum(CommercialTransactionReferenceTypeEnum, {
    message: 'O tipo de referência da negociação é inválido.',
  })
  referenceType: CommercialTransactionReferenceTypeEnum;

  @ApiProperty({ description: 'Id do item sendo negociado.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id do item negociado deve ser um número inteiro.' })
  @Min(1)
  referenceId: number;

  @ApiProperty({ description: 'Valor solicitado para a negociação.', example: 1500.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor solicitado deve ser um número válido.' })
  @Min(0)
  requestedAmount: number;

  @ApiPropertyOptional({
    description: 'Título opcional da solicitação.',
    example: 'Interesse no veículo',
  })
  @IsOptional()
  @IsString({ message: 'O título da solicitação deve ser um texto.' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Mensagem inicial da negociação.',
    example: 'Tenho interesse e consigo pagar à vista.',
  })
  @IsOptional()
  @IsString({ message: 'A descrição da negociação deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Nome do arquivo enviado junto com a solicitação.',
    example: 'arquivo.pdf',
  })
  @IsOptional()
  @IsString({ message: 'O nome do arquivo deve ser um texto.' })
  fileName?: string;

  @ApiPropertyOptional({
    description: 'URL do arquivo enviado junto com a solicitação.',
    example: 'https://cdn.example.com/arquivo.pdf',
  })
  @IsOptional()
  @IsString({ message: 'A URL do arquivo deve ser um texto.' })
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Chave de armazenamento do arquivo enviado junto com a solicitação.',
    example: 'commercial-transactions/arquivo.pdf',
  })
  @IsOptional()
  @IsString({ message: 'A chave do arquivo deve ser um texto.' })
  fileKey?: string;
}
