import { ApiProperty } from '@nestjs/swagger';
import { TextType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class TextQueriesDto {
  @ApiProperty({
    description: 'Tipo do texto institucional que deve ser recuperado.',
    enum: TextType,
    example: TextType.Terms,
  })
  @IsEnum(TextType, { message: 'O tipo de texto informado é inválido.' })
  type: TextType;
}
