import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class NewContactDto {
  @ApiProperty({
    description: 'Nome da pessoa que está entrando em contato.',
    example: 'João Silva',
  })
  @IsString({ message: 'O nome deve ser um texto.' })
  name: string;

  @ApiProperty({
    description: 'Telefone de contato, quando informado.',
    example: '+55 34 99999-0000',
    required: false,
  })
  @IsString({ message: 'O telefone deve ser um texto.' })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Email de contato do remetente.',
    example: 'joao@email.com',
  })
  @IsEmail({}, { message: 'Informe um email válido.' })
  email: string;

  @ApiProperty({
    description: 'Mensagem enviada pelo usuário.',
    example: 'Gostaria de tirar uma dúvida sobre a plataforma.',
    maxLength: 1500,
  })
  @IsString({ message: 'A mensagem deve ser um texto.' })
  text: string;
}
