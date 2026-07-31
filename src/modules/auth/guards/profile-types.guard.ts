import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserProfileType } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/is-public.decorator';
import { PROFILE_TYPES_KEY } from '../decorators/profile-types.decorator';
import { AuthRequest } from '../models/AuthRequest';

@Injectable()
export class ProfileTypesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredProfileTypes = this.reflector.getAllAndOverride<UserProfileType[]>(
      PROFILE_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredProfileTypes || requiredProfileTypes.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthRequest>();

    if (!user) {
      return true;
    }

    if (user.role === Role.Admin || user.role === Role.Master) {
      return true;
    }

    if (!requiredProfileTypes.includes(user.profileType)) {
      throw new ForbiddenException(
        `Acesso não autorizado para o perfil ${user.profileType}. Perfis permitidos: ${requiredProfileTypes.join(', ')}.`,
      );
    }

    return true;
  }
}
