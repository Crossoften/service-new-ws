import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: 'Email ou telefone do usuário para autenticação.',
    example: 'joao@email.com',
  })
  @IsString({ message: 'O email deve ser um texto.' })
  @MinLength(1, { message: 'O email é obrigatório.' })
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
