import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    description: 'Telefone informado no cadastro (ou o e-mail, se houver). Pode vir com máscara.',
    example: '+5534998701109',
  })
  @IsString({ message: 'O identificador deve ser um texto.' })
  @MinLength(1, { message: 'O identificador é obrigatório.' })
  @MaxLength(191)
  identifier: string;
}
