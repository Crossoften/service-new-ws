import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../models/UserPayload';
import { PrismaService } from '@database/PrismaService';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: UserPayload): Promise<any> {
    if (payload.role === 'Admin' || payload.role === 'Master') {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        include: { adminPermissions: true },
      });

      return user;
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      return user;
    }
  }
}
