import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateChatMessageDto {
  @ApiPropertyOptional({
    description: 'Conteúdo textual da mensagem.',
    example: 'Preciso alinhar um detalhe antes de iniciar.',
  })
  @IsOptional()
  @IsString({ message: 'A mensagem deve ser um texto.' })
  message?: string;

  @ApiPropertyOptional({
    description: 'Nome do arquivo anexado.',
    example: 'foto-servico.jpg',
  })
  @IsOptional()
  @IsString({ message: 'O nome do arquivo deve ser um texto.' })
  fileName?: string;

  @ApiPropertyOptional({
    description: 'URL pública do arquivo anexado.',
    example: 'https://cdn.seudominio.com/chats/foto-servico.jpg',
  })
  @IsOptional()
  @IsString({ message: 'A URL do arquivo deve ser um texto.' })
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Chave do arquivo anexado no storage.',
    example: 'chats/foto-servico.jpg',
  })
  @IsOptional()
  @IsString({ message: 'A chave do arquivo deve ser um texto.' })
  fileKey?: string;
}
