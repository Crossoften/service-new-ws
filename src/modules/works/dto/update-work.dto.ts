import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNumberString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWorkDto } from './create-work.dto';
import { CreateWorkFileDto } from './create-work-file.dto';

export class UpdateWorkDto extends PartialType(CreateWorkDto) {
  @ApiProperty({
    description:
      'Descrição de conclusão do trabalho, utilizada quando o serviço foi finalizado ou precisa de observações finais.',
    required: false,
    nullable: true,
    example: 'Serviço concluído com sucesso.',
    type: String,
  })
  @IsString()
  @IsOptional()
  completionDescription?: string;

  @ApiProperty({
    description:
      'Motivo do cancelamento do trabalho, usado quando o fluxo exigir encerramento antecipado.',
    required: false,
    nullable: true,
    example: 'Cliente desistiu do atendimento.',
    type: String,
  })
  @IsString()
  @IsOptional()
  cancelReason?: string;

  @ApiProperty({
    description: 'Arquivos enviados pelo cliente durante o ciclo do trabalho.',
    required: false,
    type: [CreateWorkFileDto],
    example: [
      {
        fileName: 'referencia-cliente.jpg',
        fileUrl: 'https://cdn.seudominio.com/works/referencia-cliente.jpg',
        fileKey: 'works/referencia-cliente.jpg',
      },
    ],
  })
  @IsArray()
  @Type(() => CreateWorkFileDto)
  @IsOptional()
  requesterFiles?: CreateWorkFileDto[];

  @ApiProperty({
    description:
      'Arquivos enviados na conclusão do trabalho, como evidências da entrega ou documentos finais.',
    required: false,
    type: [CreateWorkFileDto],
    example: [
      {
        fileName: 'entrega-final.jpg',
        fileUrl: 'https://cdn.seudominio.com/works/entrega-final.jpg',
        fileKey: 'works/entrega-final.jpg',
      },
    ],
  })
  @IsArray()
  @Type(() => CreateWorkFileDto)
  @IsOptional()
  completionFiles?: CreateWorkFileDto[];
}
