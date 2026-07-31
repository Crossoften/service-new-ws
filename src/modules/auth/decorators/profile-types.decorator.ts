import { SetMetadata } from '@nestjs/common';
import { UserProfileType } from '@prisma/client';

export const PROFILE_TYPES_KEY = 'profileTypes';
export const ProfileTypes = (...profileTypes: UserProfileType[]) =>
  SetMetadata(PROFILE_TYPES_KEY, profileTypes);
