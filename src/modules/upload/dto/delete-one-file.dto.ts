import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteOneFileDto {
  @ApiProperty({
    description: 'Chave do arquivo no storage que deve ser removido.',
    example: 'uploads/arquivo.pdf',
  })
  @IsString({ message: 'A chave do arquivo deve ser um texto.' })
  fileKey?: string;
}
