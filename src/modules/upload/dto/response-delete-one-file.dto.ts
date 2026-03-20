import { ApiProperty } from '@nestjs/swagger';

export class ResponseDeleteOneFileDto {
  @ApiProperty({ description: 'Identificador do arquivo removido.', example: 1 })
  id?: number;
  @ApiProperty({ description: 'Nome do arquivo removido.', example: 'arquivo.pdf' })
  name?: string;
  @ApiProperty({
    description: 'URL pública do arquivo removido, quando disponível.',
    example: 'https://cdn.example.com/arquivo.pdf',
  })
  fileUrl?: string;
  @ApiProperty({
    description: 'Chave do arquivo removido no storage.',
    example: 'uploads/arquivo.pdf',
  })
  fileKey?: string;
}
