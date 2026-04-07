import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CreateWorkFileDto } from './create-work-file.dto';

export class CreateWorkDto {
  @ApiProperty({
    description: 'Identificador do orçamento aprovado que originou o trabalho.',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'O id do orçamento deve ser um número inteiro.' })
  @Min(1)
  budgetId: number;

  @ApiProperty({
    description: 'Observações, instruções ou detalhes complementares do trabalho.',
    required: false,
    nullable: true,
    example: 'Executar o serviço com atendimento em domicílio.',
  })
  @IsString({ message: 'Os detalhes do trabalho devem ser um texto.' })
  @IsOptional()
  details?: string;

  @ApiProperty({
    description: 'Data planejada para execução do serviço em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T14:00:00.000Z',
  })
  @IsDateString({}, { message: 'A data do serviço deve estar em formato ISO 8601.' })
  @IsOptional()
  serviceDate?: string;

  @ApiProperty({
    description: 'Data final da garantia do trabalho em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-06-16T23:59:59.000Z',
  })
  @IsDateString({}, { message: 'A data da garantia deve estar em formato ISO 8601.' })
  @IsOptional()
  warrantyExpiresAt?: string;

  @ApiProperty({
    description: 'Valor principal do serviço.',
    required: false,
    example: 350.0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor do serviço deve ser um número válido.' })
  @Min(0)
  @IsOptional()
  serviceValue?: number;

  @ApiProperty({
    description: 'Valor total do trabalho, incluindo eventuais custos adicionais.',
    required: false,
    example: 350.0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor total deve ser um número válido.' })
  @Min(0)
  @IsOptional()
  totalValue?: number;

  @ApiProperty({
    description: 'Lista de anexos iniciais enviados pelo fornecedor ao criar o trabalho.',
    required: false,
    type: [CreateWorkFileDto],
    example: [
      {
        fileName: 'arquivo.pdf',
        fileUrl: 'https://cdn.seudominio.com/works/arquivo.pdf',
        fileKey: 'works/arquivo.pdf',
      },
    ],
  })
  @IsArray({ message: 'Os arquivos do fornecedor devem ser enviados em lista.' })
  @ArrayMaxSize(10, { message: 'É permitido enviar no máximo 10 arquivos.' })
  @Type(() => CreateWorkFileDto)
  @IsOptional()
  providerFiles?: CreateWorkFileDto[];
}
