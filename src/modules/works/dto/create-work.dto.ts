import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateWorkFileDto } from './create-work-file.dto';

export class CreateWorkDto {
  @ApiProperty({
    description:
      'Identificador do orçamento aprovado que originou o trabalho. Esse orçamento é usado para vincular cliente, fornecedor e serviço.',
    example: '1',
    type: String,
  })
  @IsNumberString({}, { message: 'O id do orçamento deve conter apenas números.' })
  budgetId: number;

  @ApiProperty({
    description:
      'Observações, instruções ou detalhes complementares do trabalho que serão exibidos na tela de acompanhamento.',
    required: false,
    nullable: true,
    example: 'Executar o serviço com atendimento em domicílio.',
    type: String,
  })
  @IsString({ message: 'Os detalhes do trabalho devem ser um texto.' })
  @IsOptional()
  details?: string;

  @ApiProperty({
    description: 'Data planejada para execução do serviço. Deve ser enviada em formato ISO 8601.',
    required: false,
    nullable: true,
    example: '2026-03-16T14:00:00.000Z',
    type: String,
  })
  @IsDateString({}, { message: 'A data do serviço deve estar em formato ISO 8601.' })
  @IsOptional()
  serviceDate?: string;

  @ApiProperty({
    description: 'Data final da garantia do trabalho em formato ISO 8601, quando aplicável.',
    required: false,
    nullable: true,
    example: '2026-06-16T23:59:59.000Z',
    type: String,
  })
  @IsDateString({}, { message: 'A data da garantia deve estar em formato ISO 8601.' })
  @IsOptional()
  warrantyExpiresAt?: string;

  @ApiProperty({
    description:
      'Valor principal do serviço, enviado como string decimal para preservar precisão monetária.',
    required: false,
    example: '350.00',
    type: String,
  })
  @IsNumberString({}, { message: 'O valor do serviço deve conter apenas números.' })
  @IsOptional()
  serviceValue?: string;

  @ApiProperty({
    description:
      'Valor total do trabalho, incluindo eventuais custos adicionais, enviado como string decimal.',
    required: false,
    example: '350.00',
    type: String,
  })
  @IsNumberString({}, { message: 'O valor total deve conter apenas números.' })
  @IsOptional()
  totalValue?: string;

  @ApiProperty({
    description:
      'Lista de anexos iniciais enviados pelo fornecedor ao criar o trabalho, como documentos, fotos ou comprovantes.',
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
