import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../models/UserPayload';
import { PrismaService } from '@database/PrismaService';
import { Status } from '@prisma/client';
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
    const isAdmin = payload.role === 'Admin' || payload.role === 'Master';

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      include: isAdmin ? { adminPermissions: true } : undefined,
    });

    // O token vale 360 dias. Sem revalidar o status a cada requisição, uma conta
    // bloqueada ou inativada continuaria operando com o token já emitido até ele
    // expirar — retornar null faz o Passport responder 401.
    if (!user || user.status !== Status.Active) {
      return null;
    }

    return user;
  }
}
