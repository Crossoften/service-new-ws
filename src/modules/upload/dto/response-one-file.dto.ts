import { ApiProperty } from '@nestjs/swagger';

export class ResponseOneFileDto {
  @ApiProperty({
    description: 'URL pública do arquivo enviado.',
    example: 'https://cdn.example.com/arquivo.pdf',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Chave do arquivo no storage.',
    example: 'uploads/arquivo.pdf',
  })
  fileKey: string;
}
