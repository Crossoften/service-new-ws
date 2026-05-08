import { AdminPermission, Role, UserProfileType } from '@prisma/client';

export interface UserToken {
  token: string;
  id: number;
  role: Role;
  profileType: UserProfileType;
  adminPermissions: AdminPermission[];
}
