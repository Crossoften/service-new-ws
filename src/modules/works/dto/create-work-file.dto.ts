import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateWorkFileDto {
  @ApiProperty({
    description: 'Nome original do arquivo anexado ao trabalho.',
    example: 'arquivo.pdf',
    type: String,
  })
  @IsString({ message: 'O nome do arquivo deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do arquivo é obrigatório.' })
  @MaxLength(191, { message: 'O nome do arquivo deve ter no máximo 191 caracteres.' })
  fileName: string;

  @ApiProperty({
    description:
      'URL pública completa do arquivo anexado, utilizada pelo app para download ou visualização.',
    example: 'https://cdn.seudominio.com/works/arquivo.pdf',
    type: String,
  })
  @IsUrl({}, { message: 'A URL do arquivo é inválida.' })
  @MaxLength(1500, { message: 'A URL do arquivo deve ter no máximo 1500 caracteres.' })
  fileUrl: string;

  @ApiProperty({
    description:
      'Chave única do arquivo no storage, normalmente usada para manutenção, exclusão ou reprocessamento do anexo.',
    example: 'works/arquivo.pdf',
    type: String,
  })
  @IsString({ message: 'A chave do arquivo deve ser um texto.' })
  @IsNotEmpty({ message: 'A chave do arquivo é obrigatória.' })
  @MaxLength(1500, { message: 'A chave do arquivo deve ter no máximo 1500 caracteres.' })
  fileKey: string;
}
