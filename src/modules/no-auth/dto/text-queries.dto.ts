import { ApiProperty } from '@nestjs/swagger';
import { TextType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class TextQueriesDto {
  @ApiProperty({ enum: TextType })
  @IsEnum(TextType)
  type: TextType;
}
