import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PermissionResponseDto } from 'src/modules/admin/admin-settings/dto/permission-response.dto';

export class ResponseLoginDto {
  @ApiProperty({ required: false })
  token: string;

  @ApiProperty({ required: false })
  id: number;

  @ApiProperty({ enum: [Role.Master, Role.Admin], required: false })
  role: Role;

  @ApiProperty({ type: [PermissionResponseDto], required: false })
  adminPermissions: PermissionResponseDto[];
}
