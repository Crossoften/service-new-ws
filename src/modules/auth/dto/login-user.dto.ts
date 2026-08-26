import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description:
      'Email ou telefone do usuário. O campo se chama `email` por compatibilidade ' +
      'com o contrato atual, mas aceita os dois: o que tiver `@` é tratado como ' +
      'e-mail, o resto como telefone. O telefone pode vir com máscara — ' +
      '`(34) 99870-1109`, `34998701109` e `+5534998701109` chegam no mesmo usuário.',
    example: '+5534998701109',
  })
  @IsString({ message: 'O email ou telefone deve ser um texto.' })
  @MinLength(1, { message: 'O email ou telefone é obrigatório.' })
  @MaxLength(191)
  email: string;

  @ApiProperty({
    description: 'Senha de acesso do usuário.',
    example: '12345678',
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(1, { message: 'A senha é obrigatória.' })
  @MaxLength(32)
  password: string;
}
