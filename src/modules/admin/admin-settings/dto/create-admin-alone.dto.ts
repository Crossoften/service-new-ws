import { ApiProperty } from '@nestjs/swagger';
import { AdminPermission } from '@prisma/client';

export class CreateAdminAloneDto {
  @ApiProperty()
  id?: number;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  document?: string;

  @ApiProperty()
  phone?: string;

  @ApiProperty()
  role?: string;

  @ApiProperty()
  status?: string;

  @ApiProperty()
  fileUrl?: string;

  @ApiProperty()
  fileKey?: string;

  @ApiProperty()
  adminPermissions?: AdminPermission[];

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;
}
