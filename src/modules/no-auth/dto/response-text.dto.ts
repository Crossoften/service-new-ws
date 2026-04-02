import { ApiProperty } from '@nestjs/swagger';
import { TextType } from '@prisma/client';

export class ResponseTextDto {
  @ApiProperty({ description: 'Identificador do texto institucional.', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tipo do texto retornado.', enum: TextType, example: TextType.Terms })
  type: TextType;

  @ApiProperty({
    description: 'Conteúdo do texto.',
    example: 'Termos e condições da plataforma...',
  })
  text: string;

  @ApiProperty({ description: 'Data de criação do texto.', example: '2026-03-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do texto.',
    example: '2026-03-20T12:00:00.000Z',
  })
  updatedAt: Date;
}
