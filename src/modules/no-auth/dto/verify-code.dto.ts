import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class VerifyCodeDto {
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
}
