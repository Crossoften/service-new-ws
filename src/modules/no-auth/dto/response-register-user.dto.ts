import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, Status, UserProfileType } from '@prisma/client';
import { IsDateString, IsOptional } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({ description: 'Identificador do usuário.', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome completo do usuário.', example: 'Joao Silva' })
  name: string;

  @ApiProperty({ description: 'Email do usuário.', example: 'joao@email.com' })
  email: string;

  @ApiPropertyOptional({ description: 'Telefone do usuário.', example: '+55 34 99999-0000' })
  phone?: string;

  @ApiProperty({ description: 'Perfil de acesso do usuário.', enum: Role, example: Role.User })
  role: Role;

  @ApiProperty({
    description: 'Tipo de perfil selecionado no cadastro.',
    enum: UserProfileType,
    example: UserProfileType.Supplier,
  })
  profileType: UserProfileType;

  @ApiProperty({
    description: 'Status atual do cadastro do usuário.',
    enum: Status,
    example: Status.Pending,
  })
  status: Status;

  @ApiProperty({ description: 'Data de criação do usuário.', example: '2026-03-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do usuário.',
    example: '2026-03-20T12:00:00.000Z',
  })
  updatedAt: Date;


  @ApiPropertyOptional({
    description: 'Data de nascimento do usuário no formato ISO',
    example: '1990-01-01'
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string | Date;
}

export class RegisterUserResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso do cadastro.',
    example: 'Usuário cadastrado com sucesso.',
  })
  message: string;

  @ApiProperty({ description: 'Usuário cadastrado.', type: RegisterUserDto })
  user: RegisterUserDto;
}
