import { PrismaService } from '@database/PrismaService';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Role, Status, User, UserProfileType } from '@prisma/client';
import generateCode from '@utils/generateCode';
import capitalizeFirstLetter from '@utils/capitalizeFirstLetter';
import { normalizePhoneBR, phoneLookupVariants } from '@utils/normalizePhone';
import { compareSync, hashSync } from 'bcrypt';
import { NewContactDto } from '../mail/dto/new-contact.dto';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { ForgotChannelEnum } from './enums/forgot-channel.enum';
import { RegisterBaseDto } from './dto/register-base.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RegisterUserResponseDto } from './dto/response-register-user.dto';
import { TextQueriesDto } from './dto/text-queries.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class NoAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {}

  async register(
    payload: RegisterBaseDto,
    profileType: UserProfileType,
    referralCode?: string,
  ): Promise<RegisterUserResponseDto> {
    const { name, email, phone, password, confirmPassword, acceptedTerms } = payload;

    if (!acceptedTerms) {
      throw new BadRequestException('É necessário aceitar os termos para concluir o cadastro.');
    }

    if (password !== confirmPassword) {
      throw new BadRequestException('Senhas devem ser iguais.');
    }

    // O telefone é gravado em E.164. Sem normalizar, `11955554444` e
    // `+5511955554444` são o mesmo número para o usuário e dois registros
    // distintos para o banco — a checagem de duplicidade abaixo não pegaria o
    // segundo cadastro, e o envio de SMS falharia no formato nacional.
    const normalizedPhone = phone ? normalizePhoneBR(phone) : null;

    if (phone && !normalizedPhone) {
      throw new BadRequestException('Informe um telefone válido.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email.trim() },
          // Variantes cobrem quem já se cadastrou antes da normalização.
          ...(normalizedPhone ? [{ phone: { in: phoneLookupVariants(normalizedPhone) } }] : []),
        ],
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Já existe usuário cadastrado com os dados informados.');
    }

    const user = await this.prisma.user.create({
      data: {
        name: capitalizeFirstLetter(name.trim()),
        email: email.trim(),
        phone: normalizedPhone,
        birthDate: payload.birthDate ? new Date(payload.birthDate) : undefined,
        password: hashSync(password, 10),
        role: Role.User,
        profileType,
        status: Status.Active,
        referralCode: referralCode ? referralCode.trim() : await this.generateReferralCode(name),
        socialMedias: payload.socialMedias
          ? {
              create: payload.socialMedias.map((sm) => ({
                network: sm.network,
                url: sm.url,
                followers: sm.followers ?? 0,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        phone: true,
        biography: true,
        role: true,
        profileType: true,
        status: true,
        fileUrl: true,
        fileKey: true,
        referralCode: true,
        birthDate: true,
        commissionRate: true,
        createdAt: true,
        updatedAt: true,
        socialMedias: {
          select: {
            id: true,
            network: true,
            url: true,
            followers: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { network: 'asc' },
        },
      },
    });

    if (payload.inviteCode) {
      const userInvited = await this.prisma.user.findFirst({
        where: {
          referralCode: payload.inviteCode.trim(),
        },
        select: { id: true },
      });

      if (userInvited) {
        await this.prisma.referral.create({
          data: { influencerId: userInvited.id, referredUserId: user.id },
        });
      }
    }

    return {
      message: 'Usuário cadastrado com sucesso.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        document: user.document || undefined,
        phone: user.phone || undefined,
        biography: user.biography || undefined,
        role: user.role,
        profileType: user.profileType,
        status: user.status,
        fileUrl: user.fileUrl || undefined,
        fileKey: user.fileKey || undefined,
        referralCode: user.referralCode || undefined,
        birthDate: user.birthDate || undefined,
        commissionRate: user.commissionRate !== null ? Number(user.commissionRate) : undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        socialMedias: user.socialMedias.map((sm) => ({
          id: sm.id,
          network: sm.network,
          url: sm.url,
          followers: sm.followers,
          createdAt: sm.createdAt,
          updatedAt: sm.updatedAt,
        })),
      },
    };
  }

  async forgot(channel: ForgotChannelEnum, identifier: string): Promise<void> {
    const trimmedIdentifier = identifier.trim();

    if (channel === ForgotChannelEnum.Email && !this.isEmail(trimmedIdentifier)) {
      throw new BadRequestException('O identificador deve ser um email válido.');
    }

    // Normalizar aqui resolve as duas pontas do canal SMS: a busca deixa de
    // depender da escrita exata que veio do front (máscara, DDI, ou nenhum dos
    // dois) e o Twilio recebe o E.164 que a API dele exige.
    const normalizedPhone =
      channel === ForgotChannelEnum.Sms ? normalizePhoneBR(trimmedIdentifier) : null;

    if (channel === ForgotChannelEnum.Sms && !normalizedPhone) {
      throw new BadRequestException('O identificador deve ser um telefone válido.');
    }

    if (channel === ForgotChannelEnum.Email && !this.mailService.hasCredentials()) {
      throw new BadRequestException('Credenciais de e-mail não configuradas.');
    }

    if (channel === ForgotChannelEnum.Sms && !this.smsService.hasCredentials()) {
      throw new BadRequestException('Credenciais do Twilio não configuradas.');
    }

    const user: User | null = await this.prisma.user.findFirst({
      where:
        channel === ForgotChannelEnum.Email
          ? { email: trimmedIdentifier }
          : // `in` com as variantes alcança também os telefones gravados antes
            // da normalização, sem exigir migração dos registros existentes.
            { phone: { in: phoneLookupVariants(normalizedPhone) } },
    });

    if (!user) return;

    const code: string = generateCode();
    const date: Date = new Date();

    // Enviar antes de gravar. Na ordem inversa, um envio que falhasse já teria
    // sobrescrito `code` e `codeExpiresIn` — o código anterior, ainda válido,
    // morria e nenhum novo chegava ao usuário. Gravar depois deixa a conta
    // intacta quando o provedor está fora.
    if (channel === ForgotChannelEnum.Email) {
      await this.mailService.forgotPassword(trimmedIdentifier, code);
    } else {
      await this.smsService.sendPasswordResetCode(normalizedPhone, code);
    }

    // O banco guarda apenas o hash: vazamento da tabela nao entrega os codigos
    // de recuperacao em transito.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        code: hashSync(code, 10),
        codeExpiresIn: new Date(date.setHours(date.getHours() + 4)),
      },
    });
  }

  /**
   * Localiza o usuário pelo identificador (e-mail ou telefone) e valida o código
   * de recuperação contra o hash armazenado.
   *
   * A busca precisa partir do identificador, e não do código: procurar apenas
   * pelo código permitia adivinhá-lo por força bruta contra a base inteira e,
   * em caso de colisão, redefinir a senha da conta errada.
   */
  private async findUserByResetCode(identifier: string, code: string): Promise<User> {
    const trimmedIdentifier = identifier.trim();

    // O identificador chega aqui como o usuário digitou. Se ele pediu o código
    // por SMS em um formato e confirma em outro, a conta precisa ser a mesma.
    const user: User | null = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedIdentifier },
          { phone: { in: phoneLookupVariants(trimmedIdentifier) } },
        ],
      },
    });

    // Mensagem única para usuário inexistente e código incorreto: distinguir os
    // dois casos revelaria quais identificadores existem na base.
    const invalid = new NotFoundException('Usuário ou código inválido.');

    if (!user || !user.code || !user.codeExpiresIn) throw invalid;

    if (!compareSync(code, user.code)) throw invalid;

    if (new Date() >= user.codeExpiresIn) {
      throw new UnprocessableEntityException('Código expirou!');
    }

    return user;
  }

  async verifyCode(payload: VerifyCodeDto): Promise<void> {
    const { identifier, code } = payload;

    await this.findUserByResetCode(identifier, code);
  }

  async reset(payload: ResetPasswordDto): Promise<void> {
    const { identifier, code, password, confirmPassword } = payload;

    if (password !== confirmPassword) {
      throw new BadRequestException('Senhas devem ser iguais.');
    }

    const user: User = await this.findUserByResetCode(identifier, code);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        code: null,
        codeExpiresIn: null,
        password: hashSync(password, 10),
      },
    });
  }

  async contactUs(payload: NewContactDto): Promise<void> {
    await this.mailService.contactUs(payload);
  }

  async texts(query: TextQueriesDto) {
    const { type } = query;

    return this.prisma.text.findFirst({ where: { type } });
  }

  async generateReferralCode(name: string): Promise<string> {
    const firstName = `${name
      .trim()
      .split(/\s+/)[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')}`;

    const randomHash = randomBytes(8).toString('hex');
    return `${firstName}-${randomHash}`;
  }

  /**
   * Verifica o servidor E a conexão com o banco.
   *
   * Mantém `{ message: 'Servidor UP' }` no caminho feliz para não quebrar quem
   * já consome a rota; quando o banco não responde, devolve 503 — que é o que
   * um orquestrador precisa ver para tirar a instância do balanceador.
   */
  async healthCheck(): Promise<{ message: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        message: 'Servidor indisponível',
        database: 'down',
      });
    }

    return { message: 'Servidor UP', database: 'up' };
  }

  users() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        code: true,
        role: true,
        profileType: true,
        status: true,
        fileUrl: true,
        fileKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  mySelf(id: number) {
    return this.prisma.user.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        code: true,
        role: true,
        profileType: true,
        status: true,
        fileUrl: true,
        fileKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
