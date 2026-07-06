import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BillingTypeEnum,
  Role,
  SocialNetworkEnum,
  Status,
  UserProfileType,
} from '@prisma/client';
import { ResponseAddressDto } from './response-address-dto';

export class ResponseProfileSocialMediaDto {

  @ApiProperty({
    description: 'Identificador único da rede social cadastrada.',
    example: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Rede social cadastrada.',
    enum: SocialNetworkEnum,
    enumName: 'SocialNetworkEnum',
    example: SocialNetworkEnum.Instagram,
  })
  network: SocialNetworkEnum;

  @ApiProperty({
    description: 'Url do perfil do usuário na rede social.',
    example: 'https://instagram.com/joaosilva',
    type: String,
  })
  url: string;

  @ApiProperty({
    description: 'Quantidade de seguidores informada para a rede social.',
    example: 15400,
    type: Number,
  })
  followers: number;

  @ApiProperty({
    description: 'Data de criação do registro em formato ISO 8601.',
    example: '2026-03-17T01:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do registro em formato ISO 8601.',
    example: '2026-03-17T01:00:00.000Z',
    type: String,
  })
  updatedAt: Date;
}

export class ResponseProfileDto {
  @ApiProperty({
    description: 'Identificador único do usuário autenticado.',
    example: 19,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome completo do usuário.',
    example: 'João Carlos',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Email principal do usuário.',
    example: 'joao@email.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Documento do usuário, quando cadastrado.',
    required: false,
    nullable: true,
    example: '123.456.789-10',
    type: String,
  })
  document?: string;

  @ApiProperty({
    description: 'Telefone do usuário, quando cadastrado.',
    required: false,
    nullable: true,
    example: '(34) 99999-0000',
    type: String,
  })
  phone?: string;

  @ApiProperty({
    description: 'Biografia pública do fornecedor, quando cadastrada.',
    required: false,
    nullable: true,
    example: 'Profissional com 8 anos de experiência em reformas residenciais.',
    type: String,
  })
  biography?: string;

  @ApiProperty({
    description: 'Papel do usuário autenticado.',
    enum: Role,
    enumName: 'Role',
    example: Role.User,
  })
  role: Role;

  @ApiProperty({
    description: 'Tipo de perfil selecionado no cadastro do usuário.',
    enum: UserProfileType,
    enumName: 'UserProfileType',
    example: UserProfileType.Client,
  })
  profileType: UserProfileType;

  @ApiProperty({
    description: 'Status atual do usuário.',
    enum: Status,
    enumName: 'Status',
    example: Status.Active,
  })
  status: Status;

  @ApiProperty({
    description: 'Url pública da foto de perfil do usuário, quando existir.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/users/profile.png',
    type: String,
  })
  fileUrl?: string;

  @ApiProperty({
    description: 'Chave do arquivo da foto de perfil no storage, quando existir.',
    required: false,
    nullable: true,
    example: 'users/profile.png',
    type: String,
  })
  fileKey?: string;

  @ApiProperty({
    description: 'Código de indicação que o usuário pode compartilhar.',
    required: false,
    nullable: true,
    example: 'joaosilva',
    type: String,
  })
  referralCode?: string;

  @ApiProperty({
    description: 'Data de nascimento do usuário, quando cadastrada.',
    required: false,
    nullable: true,
    example: '1990-01-01T00:00:00.000Z',
    type: String,
  })
  birthDate?: Date;

  @ApiProperty({
    description:
      'Taxa de comissão do usuário em percentual, quando aplicável (perfil Influencer).',
    required: false,
    nullable: true,
    example: 10.5,
    type: Number,
  })
  commissionRate?: number;

  @ApiProperty({
    description:
      'Redes sociais cadastradas pelo usuário. Cada rede aparece no máximo uma vez.',
    type: [ResponseProfileSocialMediaDto],
  })
  socialMedias: ResponseProfileSocialMediaDto[];

  @ApiProperty({
    description: 'Data de criação do usuário em formato ISO 8601.',
    example: '2026-03-17T01:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do usuário em formato ISO 8601.',
    example: '2026-03-17T01:00:00.000Z',
    type: String,
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Endereço do usuário, quando cadastrado.',
    type: ResponseAddressDto,
  })
  address?: ResponseAddressDto;

  @ApiPropertyOptional({
    description: 'Modelo de cobrança do usuário, quando aplicável.',
    enum: BillingTypeEnum,
    enumName: 'BillingTypeEnum',
    example: BillingTypeEnum.Subscription,
  })
  billingType?: BillingTypeEnum;
}