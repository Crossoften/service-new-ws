import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateWorkFileDto } from './create-work-file.dto';

export class RequestWorkWarrantyDto {
  @ApiProperty({
    description: 'Descrição do problema ou motivo da solicitação de garantia.',
    example: 'O serviço apresentou falha após dois dias de uso.',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Arquivos anexados à solicitação de garantia.',
    required: false,
    type: [CreateWorkFileDto],
  })
  @IsArray()
  @ArrayMaxSize(10)
  @Type(() => CreateWorkFileDto)
  @IsOptional()
  files?: CreateWorkFileDto[];
}
