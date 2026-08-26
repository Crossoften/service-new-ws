import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class VerifyAccountDto {
  @ApiProperty({
    description:
      'Telefone informado no cadastro (ou o e-mail, se houver). Pode vir com máscara: ' +
      '`(34) 99870-1109`, `34998701109` e `+5534998701109` localizam a mesma conta.',
    example: '+5534998701109',
  })
  @IsString({ message: 'O identificador deve ser um texto.' })
  @MinLength(1, { message: 'O identificador é obrigatório.' })
  @MaxLength(191)
  identifier: string;

  @ApiProperty({
    description: 'Código de verificação recebido por SMS.',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'O código deve ser um texto.' })
  @Length(6, 6, { message: 'O código deve ter 6 caracteres.' })
  code: string;
}
