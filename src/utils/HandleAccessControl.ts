import { ForbiddenException } from '@nestjs/common';
import { AdminPermissions, Role, User } from '@prisma/client';

class HandleAccessControl {
  verifyAdminRole(payload: Partial<User>): void {
    if (payload.role !== Role.Master && payload.role !== Role.Admin) {
      throw new ForbiddenException('Acesso não autorizado.');
    }
  }

  verifyPermission(payload: any, permission: AdminPermissions): void {
    const validPermission = payload.adminPermissions?.some(
      ({ name }: { name: string }) => name === permission,
    );
    if (!validPermission) throw new ForbiddenException('Acesso não autorizado.');
  }
}

export default new HandleAccessControl();
