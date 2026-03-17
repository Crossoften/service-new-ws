import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsCpfOrCnpj } from 'src/decorators/isCpfOrCnpj';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Nome completo do usuário.',
    required: false,
    example: 'João Carlos',
    type: String,
  })
  @IsString()
  @MaxLength(191)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Documento do usuário em formato CPF ou CNPJ.',
    required: false,
    example: '123.456.789-10',
    type: String,
  })
  @IsCpfOrCnpj()
  @MaxLength(18)
  @IsOptional()
  document?: string;

  @ApiProperty({
    description: 'Email principal do usuário.',
    required: false,
    example: 'joao@email.com',
    type: String,
  })
  @IsEmail()
  @MaxLength(191)
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Telefone principal do usuário.',
    required: false,
    example: '(34) 99999-0000',
    type: String,
  })
  @IsString()
  @MaxLength(191)
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Biografia pública do fornecedor. Esse campo é permitido apenas para usuários supplier.',
    required: false,
    example: 'Profissional com 8 anos de experiência em reformas residenciais.',
    type: String,
  })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  biography?: string;

  @ApiProperty({
    description: 'Url pública da foto de perfil do usuário.',
    required: false,
    example: 'https://cdn.seudominio.com/users/profile.png',
    type: String,
  })
  @IsString()
  @MaxLength(1500)
  @IsOptional()
  fileUrl?: string;

  @ApiProperty({
    description: 'Chave do arquivo da foto de perfil no storage.',
    required: false,
    example: 'users/profile.png',
    type: String,
  })
  @IsString()
  @MaxLength(1500)
  @IsOptional()
  fileKey?: string;
}
