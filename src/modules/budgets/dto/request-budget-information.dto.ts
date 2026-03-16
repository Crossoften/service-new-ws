import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateBudgetFileDto } from './create-budget-file.dto';

export class RequestBudgetInformationDto {
  @ApiProperty({
    description: 'Mensagem solicitando mais informações ao cliente.',
    example: 'Preciso de mais detalhes sobre o local e metragem.',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Arquivos anexados ao pedido de mais informações.',
    required: false,
    type: [CreateBudgetFileDto],
  })
  @IsArray()
  @ArrayMaxSize(10)
  @Type(() => CreateBudgetFileDto)
  @IsOptional()
  files?: CreateBudgetFileDto[];
}
