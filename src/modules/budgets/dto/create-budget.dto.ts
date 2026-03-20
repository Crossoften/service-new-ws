import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNumberString, IsOptional, IsString } from 'class-validator';
import { CreateBudgetFileDto } from './create-budget-file.dto';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'Identificador do serviço para o qual o orçamento será solicitado.',
    example: '3',
    type: String,
  })
  @IsNumberString({}, { message: 'O id do serviço deve conter apenas números.' })
  serviceId: number;

  @ApiProperty({
    description: 'Descrição inicial da solicitação de orçamento.',
    required: false,
    nullable: true,
    example: 'Preciso de um orçamento para atendimento residencial.',
    type: String,
  })
  @IsString({ message: 'A descrição do orçamento deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Lista de arquivos anexados à solicitação.',
    required: false,
    type: [CreateBudgetFileDto],
  })
  @IsArray({ message: 'Os arquivos devem ser enviados em lista.' })
  @ArrayMaxSize(10, { message: 'É permitido enviar no máximo 10 arquivos.' })
  @Type(() => CreateBudgetFileDto)
  @IsOptional()
  files?: CreateBudgetFileDto[];
}
