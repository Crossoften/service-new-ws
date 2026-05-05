import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfileType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateUserSocialMediaDto } from './create-user-social-media.dto';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário.',
    example: 'Joao Silva',
  })
  @IsString({ message: 'O nome deve ser um texto.' })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres.' })
  @MaxLength(120, { message: 'O nome deve ter no máximo 120 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Email do usuário.',
    example: 'joao@email.com',
  })
  @IsEmail({}, { message: 'Informe um email válido.' })
  email: string;

  @ApiPropertyOptional({
    description: 'Telefone do usuário.',
    example: '+55 34 99999-0000',
  })
  @IsOptional()
  @IsPhoneNumber('BR', { message: 'Informe um telefone válido no formato brasileiro.' })
  phone?: string;

  @ApiProperty({
    description: 'Perfil selecionado no cadastro.',
    enum: UserProfileType,
    example: UserProfileType.Supplier,
  })
  @IsEnum(UserProfileType, { message: 'O perfil selecionado é inválido.' })
  profileType: UserProfileType;

  @ApiProperty({
    description: 'Senha de acesso.',
    example: '12345678',
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(32, { message: 'A senha deve ter no máximo 32 caracteres.' })
  password: string;

  @ApiProperty({
    description: 'Confirmação da senha.',
    example: '12345678',
  })
  @IsString({ message: 'A confirmação de senha deve ser um texto.' })
  @MinLength(8, { message: 'A confirmação de senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(32, { message: 'A confirmação de senha deve ter no máximo 32 caracteres.' })
  confirmPassword: string;

  @ApiProperty({
    description: 'Confirmação de aceite dos termos de uso.',
    example: true,
  })
  @IsBoolean({ message: 'O aceite dos termos deve ser verdadeiro ou falso.' })
  acceptedTerms: boolean;

  @ApiPropertyOptional({
    description: 'Redes sociais do usuário. Cada rede pode ser cadastrada apenas uma vez.',
    type: [CreateUserSocialMediaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUserSocialMediaDto)
  @IsOptional()
  socialMedias?: CreateUserSocialMediaDto[];
}
