import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, SocialNetworkEnum, Status, UserProfileType } from '@prisma/client';
import { IsDateString, IsOptional } from 'class-validator';

export class RegisterUserSocialMediaDto {
  @ApiProperty({ description: 'Identificador da rede social cadastrada.', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Rede social cadastrada.',
    enum: SocialNetworkEnum,
    example: SocialNetworkEnum.Instagram,
  })
  network: SocialNetworkEnum;

  @ApiProperty({
    description: 'Url do perfil do usuário na rede social.',
    example: 'https://instagram.com/joaosilva',
  })
  url: string;

  @ApiProperty({ description: 'Quantidade de seguidores informada.', example: 15400 })
  followers: number;

  @ApiProperty({ description: 'Data de criação do registro.', example: '2026-03-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do registro.',
    example: '2026-03-20T12:00:00.000Z',
  })
  updatedAt: Date;
}

export class RegisterUserDto {
  @ApiProperty({ description: 'Identificador do usuário.', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome completo do usuário.', example: 'Joao Silva' })
  name: string;

  @ApiProperty({ description: 'Email do usuário.', example: 'joao@email.com' })
  email: string;

  @ApiPropertyOptional({ description: 'Documento do usuário, quando cadastrado.', example: '123.456.789-10' })
  document?: string;

  @ApiPropertyOptional({ description: 'Telefone do usuário.', example: '+55 34 99999-0000' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Biografia pública do fornecedor, quando cadastrada.',
    example: 'Profissional com 8 anos de experiência em reformas residenciais.',
  })
  biography?: string;

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

  @ApiPropertyOptional({
    description: 'Url pública da foto de perfil do usuário, quando existir.',
    example: 'https://cdn.seudominio.com/users/profile.png',
  })
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Chave do arquivo da foto de perfil no storage, quando existir.',
    example: 'users/profile.png',
  })
  fileKey?: string;

  @ApiPropertyOptional({
    description: 'Código de indicação que o usuário pode compartilhar.',
    example: 'joaosilva',
  })
  referralCode?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento do usuário no formato ISO',
    example: '1990-01-01',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string | Date;

  @ApiPropertyOptional({
    description: 'Taxa de comissão do usuário em percentual, quando aplicável (perfil Influencer).',
    example: 10.5,
  })
  commissionRate?: number;

  @ApiProperty({
    description: 'Redes sociais cadastradas pelo usuário.',
    type: [RegisterUserSocialMediaDto],
  })
  socialMedias: RegisterUserSocialMediaDto[];

  @ApiProperty({ description: 'Data de criação do usuário.', example: '2026-03-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do usuário.',
    example: '2026-03-20T12:00:00.000Z',
  })
  updatedAt: Date;
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