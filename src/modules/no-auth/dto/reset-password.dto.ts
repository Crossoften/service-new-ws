import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

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
    minLength: 8,
    maxLength: 32,
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(32, { message: 'A senha deve ter no máximo 32 caracteres.' })
  password: string;

  @ApiProperty({
    description: 'Confirmação da nova senha.',
    example: '12345678',
    minLength: 8,
    maxLength: 32,
  })
  @IsString({ message: 'A confirmação de senha deve ser um texto.' })
  @MinLength(8, { message: 'A confirmação de senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(32, { message: 'A confirmação de senha deve ter no máximo 32 caracteres.' })
  confirmPassword: string;
}
