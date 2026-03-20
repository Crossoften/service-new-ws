import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({
    description: 'Código de verificação enviado ao usuário.',
    example: '1234',
    maxLength: 4,
  })
  @IsString({ message: 'O código deve ser um texto.' })
  @MaxLength(4, { message: 'O código deve ter no máximo 4 caracteres.' })
  code: string;
}
