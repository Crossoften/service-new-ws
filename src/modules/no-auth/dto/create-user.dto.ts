import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfileType } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário.',
    example: 'Joao Silva',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @ApiProperty({
    description: 'Email do usuário.',
    example: 'joao@email.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Telefone do usuário.',
    example: '+55 34 99999-0000',
  })
  @IsOptional()
  @IsPhoneNumber('BR')
  phone?: string;

  @ApiProperty({
    description: 'Perfil selecionado no cadastro.',
    enum: UserProfileType,
    example: UserProfileType.Supplier,
  })
  @IsEnum(UserProfileType)
  profileType: UserProfileType;

  @ApiProperty({
    description: 'Senha de acesso.',
    example: '12345678',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password: string;

  @ApiProperty({
    description: 'Confirmação da senha.',
    example: '12345678',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  confirmPassword: string;

  @ApiProperty({
    description: 'Confirmação de aceite dos termos de uso.',
    example: true,
  })
  @IsBoolean()
  acceptedTerms: boolean;
}
