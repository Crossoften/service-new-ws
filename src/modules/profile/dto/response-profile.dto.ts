import { ApiProperty } from '@nestjs/swagger';
import { Role, Status } from '@prisma/client';

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
}
