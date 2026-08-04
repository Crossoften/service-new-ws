import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoginService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { adminPermissions: true } });
  }

  async findByEmailOrPhone(identifier: string) {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');

    return this.prisma.user.findFirst({
      where: isEmail ? { email: trimmed } : { phone: trimmed },
      include: { adminPermissions: true },
    });
  }
}
