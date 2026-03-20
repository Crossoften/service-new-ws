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
  @IsString({ message: 'A descrição da garantia deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição da garantia é obrigatória.' })
  description: string;

  @ApiProperty({
    description: 'Arquivos anexados à solicitação de garantia.',
    required: false,
    type: [CreateWorkFileDto],
  })
  @IsArray({ message: 'Os arquivos da garantia devem ser enviados em lista.' })
  @ArrayMaxSize(10, { message: 'É permitido enviar no máximo 10 arquivos.' })
  @Type(() => CreateWorkFileDto)
  @IsOptional()
  files?: CreateWorkFileDto[];
}
