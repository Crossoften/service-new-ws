import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CreateWorkFileDto } from './create-work-file.dto';

export class FinishWorkDto {
  @ApiProperty({
    description: 'Descrição final do serviço executado.',
    example: 'Serviço concluído conforme combinado.',
  })
  @IsString({ message: 'A descrição da conclusão deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição da conclusão é obrigatória.' })
  completionDescription: string;

  @ApiProperty({
    description: 'Data efetiva de realização ou conclusão do serviço em formato ISO 8601.',
    required: false,
    example: '2026-03-16T18:00:00.000Z',
  })
  @IsDateString({}, { message: 'A data do serviço deve estar em formato ISO 8601.' })
  @IsOptional()
  serviceDate?: string;

  @ApiProperty({ description: 'Valor final do serviço executado.', required: false, example: 350.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor do serviço deve ser um número válido.' })
  @Min(0)
  @IsOptional()
  serviceValue?: number;

  @ApiProperty({ description: 'Valor total final do trabalho concluído.', required: false, example: 350.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor total deve ser um número válido.' })
  @Min(0)
  @IsOptional()
  totalValue?: number;

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
    description: 'Arquivos anexados no encerramento do trabalho.',
    required: false,
    type: [CreateWorkFileDto],
    example: [
      {
        fileName: 'comprovante-final.pdf',
        fileUrl: 'https://cdn.seudominio.com/works/comprovante-final.pdf',
        fileKey: 'works/comprovante-final.pdf',
      },
    ],
  })
  @IsArray({ message: 'Os arquivos de conclusão devem ser enviados em lista.' })
  @ArrayMaxSize(10, { message: 'É permitido enviar no máximo 10 arquivos.' })
  @Type(() => CreateWorkFileDto)
  @IsOptional()
  completionFiles?: CreateWorkFileDto[];
}
