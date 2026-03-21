import { ApiProperty } from '@nestjs/swagger';
import { WorkFileTypeEnum } from '../enums/work-file-type.enum';

export class ResponseWorkFileDto {
  @ApiProperty({
    description: 'Identificador único do arquivo vinculado ao trabalho.',
    example: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome original do arquivo anexado ao trabalho.',
    example: 'arquivo.pdf',
    type: String,
  })
  fileName: string;

  @ApiProperty({
    description: 'URL pública completa do arquivo para download ou visualização.',
    example: 'https://cdn.seudominio.com/works/arquivo.pdf',
    type: String,
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Chave do arquivo no storage utilizada internamente para identificar o anexo.',
    example: 'works/arquivo.pdf',
    type: String,
  })
  fileKey: string;

  @ApiProperty({
    description: 'Origem do arquivo no trabalho.',
    enum: WorkFileTypeEnum,
    enumName: 'WorkFileTypeEnum',
    example: WorkFileTypeEnum.Requester,
  })
  type: WorkFileTypeEnum;

  @ApiProperty({
    description: 'Data de criação do registro do arquivo em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do registro do arquivo em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  updatedAt: Date;
}
