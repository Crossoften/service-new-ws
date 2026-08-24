import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description:
      'Email ou telefone do usuário — o mesmo informado ao solicitar a recuperação. ' +
      'Necessário para localizar a conta: o código sozinho não identifica o usuário.',
    example: 'joao@email.com',
  })
  @IsString({ message: 'O identificador deve ser um texto.' })
  @MinLength(1, { message: 'O identificador é obrigatório.' })
  @MaxLength(191)
  identifier: string;

  @ApiProperty({
    description: 'Código de verificação enviado ao usuário.',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'O código deve ser um texto.' })
  @Length(6, 6, { message: 'O código deve ter 6 caracteres.' })
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
