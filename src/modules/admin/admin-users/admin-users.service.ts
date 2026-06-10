import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, Role, UserProfileType } from '@prisma/client';
import { QueryAdminUserDto } from './dto/query-admin-user.dto';
import { ResponseAdminUserDto } from './dto/response-admin-user.dto';
import { ResponseFindAllAdminUserDto } from './dto/response-find-all-admin-user.dto';
import { AdminUserInvalidIdException } from './exceptions/admin-user-invalid-id.exception';
import { AdminUserNotFoundException } from './exceptions/admin-user-not-found.exception';
import { UpdateUserDto } from './dto/update-user';

@Injectable()
export class AdminUsersService {
  constructor(private readonly _prisma: PrismaService) { }

  private readonly userSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    name: true,
    email: true,
    phone: true,
    document: true,
    birthDate: true,
    profileType: true,
    status: true,
    fileUrl: true,
    fileKey: true,
    createdAt: true,
    updatedAt: true,
    referralCode: true
  });

  async findAll(query: QueryAdminUserDto): Promise<ResponseFindAllAdminUserDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;
    const search = query.search ? query.search.trim() : undefined;

    const where: Prisma.UserWhereInput = {
      role: Role.User,
      status: query.status,
      OR: search
        ? [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { document: { contains: search } },
        ]
        : undefined,
    };

    const sortField = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDirection ?? 'desc';

    const [users, totalRecords] = await Promise.all([
      this._prisma.user.findMany({
        where,
        select: this.userSelect,
        orderBy: { [sortField]: sortDir } as Prisma.UserOrderByWithRelationInput,
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.user.count({ where }),
    ]);

    const serviceCounts =
      users.length > 0
        ? await this._prisma.service.groupBy({
          by: ['userId'],
          where: {
            userId: { in: users.map((user) => user.id) },
            isActive: true,
          },
          _count: {
            _all: true,
          },
        })
        : [];

    const serviceCountMap = new Map(serviceCounts.map((item) => [item.userId, item._count._all]));

    return {
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate ?? undefined,
        profileType: user.profileType as UserProfileType,
        status: user.status,
        openServices: serviceCountMap.get(user.id) || 0,
        fileUrl: user.fileUrl,
        referralCode: user.referralCode || undefined,
      })),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseAdminUserDto> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new AdminUserInvalidIdException();
    }

    const user = await this._prisma.user.findFirst({
      where: {
        id,
        role: Role.User,
      },
      select: this.userSelect,
    });

    if (!user) {
      throw new AdminUserNotFoundException();
    }

    const openServices = await this._prisma.service.count({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      document: user.document,
      birthDate: user.birthDate ?? undefined,
      status: user.status,
      openServices,
      fileUrl: user.fileUrl,
      fileKey: user.fileKey,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      referralCode: user.referralCode ?? undefined,
    };
  }

  async updateStatus(id: number): Promise<ResponseAdminUserDto> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new AdminUserInvalidIdException();
    }

    const user = await this._prisma.user.findFirst({
      where: { id, role: Role.User },
    });


    if (!user) throw new AdminUserNotFoundException();

    await this._prisma.user.update({
      where: { id },
      data: { status: user.status === 'Active' ? "Inactive" : "Active" },
    });

    return this.findById(id);
  }

  async update(id: number, data: UpdateUserDto): Promise<ResponseAdminUserDto> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new AdminUserInvalidIdException();
    }

    const user = await this._prisma.user.findFirst({
      where: { id, role: Role.User },
    });

    if (data.birthDate) {
      data.birthDate = new Date(data.birthDate);
    }

    if (!user) throw new AdminUserNotFoundException();

    await this._prisma.user.update({
      where: { id },
      data: data,
    });

    return this.findById(id);
  }

  async findAllReferrals() {
    const referrals = await this._prisma.referral.findMany({
      orderBy: { createdAt: 'desc' },
      include: {

        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            referralCode: true,
            profileType: true,
          },
        },

        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      referrals: referrals.map((ref) => ({
        id: ref.id,
        status: ref.isPaying ? 'Convertido' : 'Aguardando Pagamento',
        commissionAmount: ref.commissionAmount ? Number(ref.commissionAmount) : null,
        paidAt: ref.paidAt,
        createdAt: ref.createdAt,


        referrer: {
          id: ref.influencer.id,
          name: ref.influencer.name,
          email: ref.influencer.email,
          referralCode: ref.influencer.referralCode,
          profileType: ref.influencer.profileType,
        },


        referredUser: {
          id: ref.referredUser.id,
          name: ref.referredUser.name,
          email: ref.referredUser.email,
          phone: ref.referredUser.phone,
          registeredAt: ref.referredUser.createdAt,
        },
      })),
      totalRecords: referrals.length,
    };
  }
}
