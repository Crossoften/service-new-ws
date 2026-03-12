import { AdminPermission, Role } from '@prisma/client';

export interface UserToken {
  token: string;
  id: number;
  role: Role;
  adminPermissions: AdminPermission[];
}
