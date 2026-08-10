import { PrismaService } from '@database/PrismaService';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Role, Status, User, UserProfileType } from '@prisma/client';
import generateCode from '@utils/generateCode';
import capitalizeFirstLetter from '@utils/capitalizeFirstLetter';
import { hashSync } from 'bcrypt';
import { NewContactDto } from '../mail/dto/new-contact.dto';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { ForgotChannelEnum } from './enums/forgot-channel.enum';
import { RegisterBaseDto } from './dto/register-base.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: email.trim() }, ...(phone ? [{ phone: phone.trim() }] : [])],
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
        phone: phone ? phone.trim() : null,
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

    if (channel === ForgotChannelEnum.Sms && !this.isPhone(trimmedIdentifier)) {
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
          : { phone: trimmedIdentifier },
    });

    if (!user) return;

    const code: string = generateCode();
    const date: Date = new Date();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { code, codeExpiresIn: new Date(date.setHours(date.getHours() + 4)) },
    });

    if (channel === ForgotChannelEnum.Email) {
      await this.mailService.forgotPassword(trimmedIdentifier, code);
    } else {
      await this.smsService.sendPasswordResetCode(trimmedIdentifier, code);
    }
  }

  async verifyCode(code: string): Promise<void> {
    const user: User | null = await this.prisma.user.findFirst({ where: { code } });

    if (!user) throw new NotFoundException('Usuário ou código inválido.');

    const date: Date = new Date();

    if (date >= user.codeExpiresIn) {
      throw new UnprocessableEntityException('Código expirou!');
    }
  }

  async reset(payload: ResetPasswordDto): Promise<void> {
    const { code, password, confirmPassword } = payload;

    const user: User | null = await this.prisma.user.findFirst({ where: { code } });

    if (!user) throw new NotFoundException('Usuário ou código inválido.');

    if (password !== confirmPassword) {
      throw new BadRequestException('Senhas devem ser iguais.');
    }

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

  private isPhone(value: string): boolean {
    return /^[+\d][\d\s().-]{7,}$/.test(value);
  }
}
