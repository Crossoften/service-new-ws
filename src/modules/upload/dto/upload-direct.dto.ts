import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

import { TIPOS_DE_VIDEO } from '../upload-direct.constants';

export class PresignUploadDto {
  @ApiProperty({
    description: 'Nome original do arquivo. Serve só para preservar a extensão na chave gerada.',
    example: 'obra-concluida.mp4',
  })
  @IsString({ message: 'O nome do arquivo deve ser um texto.' })
  @MinLength(1, { message: 'O nome do arquivo é obrigatório.' })
  @MaxLength(255, { message: 'O nome do arquivo deve ter no máximo 255 caracteres.' })
  fileName: string;

  @ApiProperty({
    description: 'Tipo do conteúdo. Só vídeo passa por aqui; imagem usa POST /v1/upload/one-file.',
    enum: TIPOS_DE_VIDEO,
    example: 'video/mp4',
  })
  @IsIn(TIPOS_DE_VIDEO as unknown as string[], {
    message: 'O upload direto aceita apenas vídeo. Para imagem, use POST /v1/upload/one-file.',
  })
  contentType: string;
}

export class ConfirmUploadDto {
  @ApiProperty({
    description: 'A `fileKey` devolvida pelo presign.',
    example: '1791164368874-obra-concluida.mp4',
  })
  @IsString({ message: 'A chave do arquivo deve ser um texto.' })
  @MinLength(1, { message: 'A chave do arquivo é obrigatória.' })
  fileKey: string;

  @ApiProperty({
    description:
      'O `token` devolvido pelo presign. Prova que esta chave foi autorizada para este ' +
      'usuário, e impede registrar em nome próprio um arquivo de outra pessoa.',
  })
  @IsString({ message: 'O token deve ser um texto.' })
  @MinLength(1, { message: 'O token é obrigatório.' })
  token: string;
}

export class ResponsePresignUploadDto {
  @ApiProperty({
    description:
      'Para onde o arquivo vai. `s3` é o caminho normal; `api` aparece em ambiente sem ' +
      'credenciais da AWS, para o front conseguir desenvolver. O envio é igual nos dois: ' +
      'um POST `multipart/form-data` para `uploadUrl`, com os `fields` antes do arquivo.',
    enum: ['s3', 'api'],
    example: 's3',
  })
  strategy: 's3' | 'api';

  @ApiProperty({ description: 'Endereço do POST de envio.' })
  uploadUrl: string;

  @ApiProperty({
    description:
      'Campos que precisam ir no formulário ANTES do campo `file`. Vazio na estratégia `api`.',
    example: { key: '1791164368874-video.mp4', 'Content-Type': 'video/mp4' },
  })
  fields: Record<string, string>;

  @ApiProperty({ description: 'Chave gerada pelo servidor. Use-a no confirm.' })
  fileKey: string;

  @ApiProperty({ description: 'Prova de autorização. Use-a no confirm.' })
  token: string;

  @ApiProperty({ description: 'Teto de tamanho em bytes, imposto pelo S3.', example: 209715200 })
  maxBytes: number;

  @ApiProperty({ description: 'Validade da autorização, em segundos.', example: 900 })
  expiresIn: number;

  @ApiPropertyOptional({
    description: 'Como a URL definitiva do arquivo ficará depois do confirm.',
  })
  previewUrl?: string;
}
