import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Código de verificação enviado ao usuário.',
    example: '1234',
    maxLength: 4,
  })
  @IsString({ message: 'O código deve ser um texto.' })
  @MaxLength(4, { message: 'O código deve ter no máximo 4 caracteres.' })
  code: string;

  @ApiProperty({
    description: 'Nova senha de acesso.',
    example: '12345678',
    maxLength: 8,
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MaxLength(8, { message: 'A senha deve ter no máximo 8 caracteres.' })
  password: string;

  @ApiProperty({
    description: 'Confirmação da nova senha.',
    example: '12345678',
    maxLength: 8,
  })
  @IsString({ message: 'A confirmação de senha deve ser um texto.' })
  @MaxLength(8, { message: 'A confirmação de senha deve ter no máximo 8 caracteres.' })
  confirmPassword: string;
}
