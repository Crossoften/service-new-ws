import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MaxLength, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Nome completo do usuário',
    example: 'João da Silva',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Endereço de e-mail do usuário',
    example: 'joao@email.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Documento (CPF ou CNPJ) do usuário',
    maxLength: 18,
    example: '123.456.789-00',
  })
  @IsOptional()
  @IsString()
  @MaxLength(18)
  document?: string;

  @ApiPropertyOptional({
    description: 'Biografia ou descrição do usuário',
  })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiPropertyOptional({
    description: 'Telefone de contato do usuário',
    example: '+5511999999999',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento do usuário no formato ISO',
    example: '1990-01-01',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string | Date;

  @ApiPropertyOptional({
    description: 'URL da imagem de perfil',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Chave da imagem de perfil no storage (ex: AWS S3)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  fileKey?: string;
}
