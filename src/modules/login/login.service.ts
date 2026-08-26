import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { phoneLookupVariants } from '@utils/normalizePhone';

@Injectable()
export class LoginService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca por id, usada para montar a resposta do login.
   *
   * Antes isso era feito por e-mail. Com e-mail opcional, `findUnique` por um
   * campo nulo é recusado pelo Prisma: o usuário passava pela autenticação e
   * estourava ao montar a resposta. O id sempre existe.
   */
  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id }, include: { adminPermissions: true } });
  }

  /**
   * Localiza o usuário pelo que ele digitou na tela de login, que pode ser
   * e-mail ou telefone.
   *
   * O telefone não pode ser comparado por igualdade exata: o cadastro grava em
   * E.164 (`+5534998701109`) e a tela de login costuma enviar com máscara
   * (`(34) 99870-1109`). Sem normalizar, o mesmo número escrito de dois jeitos
   * vira dois usuários diferentes para o banco — e o login falha com
   * "acesso não autorizado", indistinguível de senha errada.
   *
   * As variantes ainda cobrem os registros gravados antes da normalização.
   */
  async findByEmailOrPhone(identifier: string) {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');

    return this.prisma.user.findFirst({
      where: isEmail ? { email: trimmed } : { phone: { in: phoneLookupVariants(trimmed) } },
      include: { adminPermissions: true },
    });
  }
}
