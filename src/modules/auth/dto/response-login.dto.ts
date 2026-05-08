import { ApiProperty } from '@nestjs/swagger';
import { Role, UserProfileType } from '@prisma/client';
import { PermissionResponseDto } from 'src/modules/admin/admin-settings/dto/permission-response.dto';

export class ResponseLoginDto {
  @ApiProperty({
    description: 'Token JWT retornado no login.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  token: string;

  @ApiProperty({
    description: 'Identificador do usuário autenticado.',
    example: 1,
    required: false,
  })
  id: number;

  @ApiProperty({
    description: 'Perfil administrativo retornado no login do portal gerencial.',
    enum: [Role.Master, Role.Admin],
    example: Role.Admin,
    required: false,
  })
  role: Role;

  @ApiProperty({
    description: 'Tipo de perfil do usuário autenticado.',
    enum: UserProfileType,
    enumName: 'UserProfileType',
    example: UserProfileType.Client,
    required: false,
  })
  profileType: UserProfileType;

  @ApiProperty({
    description: 'Lista de permissões administrativas do usuário autenticado.',
    type: [PermissionResponseDto],
    required: false,
  })
  adminPermissions: PermissionResponseDto[];
}
