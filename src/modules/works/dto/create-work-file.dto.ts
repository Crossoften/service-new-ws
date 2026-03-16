import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateWorkFileDto {
  @ApiProperty({
    description: 'Nome original do arquivo anexado ao trabalho.',
    example: 'arquivo.pdf',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  fileName: string;

  @ApiProperty({
    description:
      'URL pública completa do arquivo anexado, utilizada pelo app para download ou visualização.',
    example: 'https://cdn.seudominio.com/works/arquivo.pdf',
    type: String,
  })
  @IsUrl()
  @MaxLength(1500)
  fileUrl: string;

  @ApiProperty({
    description:
      'Chave única do arquivo no storage, normalmente usada para manutenção, exclusão ou reprocessamento do anexo.',
    example: 'works/arquivo.pdf',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  fileKey: string;
}
