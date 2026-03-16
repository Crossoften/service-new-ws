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
  @IsNumberString()
  serviceId: number;

  @ApiProperty({
    description: 'Descrição inicial da solicitação de orçamento.',
    required: false,
    nullable: true,
    example: 'Preciso de um orçamento para atendimento residencial.',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Lista de arquivos anexados à solicitação.',
    required: false,
    type: [CreateBudgetFileDto],
  })
  @IsArray()
  @ArrayMaxSize(10)
  @Type(() => CreateBudgetFileDto)
  @IsOptional()
  files?: CreateBudgetFileDto[];
}
