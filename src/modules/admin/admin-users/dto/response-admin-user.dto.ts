import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class ResponseAdminUserDto {
  @ApiProperty({
    description: 'Identificador único do usuário.',
    example: 15,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome completo do usuário.',
    example: 'Marina Silva',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Email principal do usuário.',
    example: 'marina@email.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Telefone do usuário, quando cadastrado.',
    required: false,
    nullable: true,
    example: '(34) 9 9290-0000',
    type: String,
  })
  phone?: string;

  @ApiProperty({
    description: 'Documento do usuário, quando cadastrado.',
    required: false,
    nullable: true,
    example: '123.456.789-10',
    type: String,
  })
  document?: string;

  @ApiProperty({
    description: 'Status atual do usuário.',
    enum: Status,
    enumName: 'Status',
    example: Status.Active,
  })
  status: Status;

  @ApiProperty({
    description: 'Quantidade de serviços ativos cadastrados pelo usuário.',
    example: 2,
    type: Number,
  })
  openServices: number;

  @ApiProperty({
    description: 'URL pública da foto de perfil do usuário, quando existir.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/users/profile.png',
    type: String,
  })
  fileUrl?: string;

  @ApiProperty({
    description: 'Chave do arquivo de foto do usuário no storage, quando existir.',
    required: false,
    nullable: true,
    example: 'users/profile.png',
    type: String,
  })
  fileKey?: string;

  @ApiProperty({
    description: 'Data de nascimento do usuário.',
    required: false,
    nullable: true,
    example: '1995-08-20T00:00:00.000Z',
    type: String,
  })
  birthDate?: Date;

  @ApiProperty({
    description: 'Data de criação do usuário em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do usuário em formato ISO 8601.',
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  updatedAt: Date;
}

export class ResponseAdminUserListDto {
  @ApiProperty({
    description: 'Identificador único do usuário.',
    example: 15,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome completo do usuário.',
    example: 'Marina Silva',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Email principal do usuário.',
    example: 'marina@email.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Telefone do usuário, quando cadastrado.',
    required: false,
    nullable: true,
    example: '(34) 9 9290-0000',
    type: String,
  })
  phone?: string;

  @ApiProperty({
    description: 'Status atual do usuário.',
    enum: Status,
    enumName: 'Status',
    example: Status.Active,
  })
  status: Status;

  @ApiProperty({
    description: 'Quantidade de serviços ativos cadastrados pelo usuário.',
    example: 2,
    type: Number,
  })
  openServices: number;

  @ApiProperty({
    description: 'URL pública da foto de perfil do usuário, quando existir.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/users/profile.png',
    type: String,
  })
  fileUrl?: string;
}
