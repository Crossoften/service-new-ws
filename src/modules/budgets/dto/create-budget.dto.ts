import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateBudgetFileDto } from './create-budget-file.dto';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'Identificador do serviço para o qual o orçamento será solicitado.',
    example: 3,
  })
  @Type(() => Number)
  @IsInt({ message: 'O id do serviço deve ser um número inteiro.' })
  @Min(1)
  serviceId: number;

  @ApiProperty({
    description: 'Descrição inicial da solicitação de orçamento.',
    required: false,
    nullable: true,
    example: 'Preciso de um orçamento para atendimento residencial.',
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
