import { Role } from '@prisma/client';

export interface UserPayload {
  email?: string;
  id: number;
  role: Role;
  iat?: number;
  exp?: number;
}
