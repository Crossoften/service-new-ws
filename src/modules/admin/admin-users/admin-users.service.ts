import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, Role, UserProfileType } from '@prisma/client';
import { QueryAdminUserDto } from './dto/query-admin-user.dto';
import { ResponseAdminUserDto } from './dto/response-admin-user.dto';
import { ResponseFindAllAdminUserDto } from './dto/response-find-all-admin-user.dto';
import { AdminUserInvalidIdException } from './exceptions/admin-user-invalid-id.exception';
import { AdminUserNotFoundException } from './exceptions/admin-user-not-found.exception';
import { UpdateUserDto } from './dto/update-user';
import { PaymentStatusEnum } from 'src/modules/works/enums/payment-status.enum';

@Injectable()
export class AdminUsersService {
  constructor(private readonly _prisma: PrismaService) {}

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
    referralCode: true,
  });

  async findAll(query: QueryAdminUserDto): Promise<ResponseFindAllAdminUserDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;
    const search = query.search ? query.search.trim() : undefined;

    const subscriptionAmountFilter =
      query.minSubscriptionAmount !== undefined || query.maxSubscriptionAmount !== undefined
        ? {
            amount: {
              ...(query.minSubscriptionAmount !== undefined && {
                gte: query.minSubscriptionAmount,
              }),
              ...(query.maxSubscriptionAmount !== undefined && {
                lte: query.maxSubscriptionAmount,
              }),
            },
          }
        : {};

    const wantsSubscription =
      query.hasSubscription === 'true' ||
      query.minSubscriptionAmount !== undefined ||
      query.maxSubscriptionAmount !== undefined;

    const where: Prisma.UserWhereInput = {
      role: Role.User,
      status: query.status,
      profileType: query.profileType,
      billingType: query.billingType,

      OR: search
        ? [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { document: { contains: search } },
          ]
        : undefined,

      // Endereço (relação 1:1)
      ...((query.city || query.state) && {
        address: {
          ...(query.city && { city: { contains: query.city.trim() } }),
          ...(query.state && { state: { contains: query.state.trim() } }),
        },
      }),

      // Indicado por um influencer específico (relação referredByInfluencer)
      ...(query.referredByInfluencerId !== undefined && {
        referredByInfluencer: {
          influencerId: query.referredByInfluencerId,
        },
      }),

      // Presta serviço em determinada categoria e/ou tem serviço ativo (relação services)
      ...((query.serviceCategoryId !== undefined || query.hasActiveService === 'true') && {
        services: {
          some: {
            ...(query.hasActiveService === 'true' && { isActive: true }),
            ...(query.serviceCategoryId !== undefined && { categoryId: query.serviceCategoryId }),
          },
        },
      }),

      // Assinatura ativa e/ou faixa de valor (relação subscriptions)
      ...(wantsSubscription && {
        subscriptions: {
          some: {
            status: 'Active',
            ...subscriptionAmountFilter,
          },
        },
      }),

      ...(query.hasPaid === 'true' && {
        sentPayments: {
          some: {
            status: PaymentStatusEnum.Paid,
          },
        },
      }),

      ...(query.hasReceivedPayment === 'true' && {
        receivedPayments: {
          some: {
            status: PaymentStatusEnum.Paid,
          },
        },
      }),
    };

    const sortField = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDirection ?? 'desc';

    const [users, totalRecords] = await Promise.all([
      this._prisma.user.findMany({
        where,
        select: {
          ...this.userSelect,
          billingType: true,
          address: {
            select: {
              id: true,
              city: true,
              state: true,
              street: true,
              number: true,
              zipCode: true,
              neighborhood: true,
            },
          },
          _count: { select: { referrals: true } },
        },
        orderBy: { [sortField]: sortDir } as Prisma.UserOrderByWithRelationInput,
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.user.count({ where }),
    ]);

    // Filtro de "mínimo de indicações" — aplicado após o count por depender do _count
    const filteredUsers =
      query.minReferrals !== undefined
        ? users.filter((u) => u._count.referrals >= query.minReferrals!)
        : users;

    const serviceCounts =
      filteredUsers.length > 0
        ? await this._prisma.service.groupBy({
            by: ['userId'],
            where: {
              userId: { in: filteredUsers.map((user) => user.id) },
              isActive: true,
            },
            _count: { _all: true },
          })
        : [];

    const serviceCountMap = new Map(serviceCounts.map((item) => [item.userId, item._count._all]));

    return {
      users: filteredUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate ?? undefined,
        profileType: user.profileType as UserProfileType,
        status: user.status,
        billingType: user.billingType ?? undefined,
        totalReferrals: user._count.referrals,
        openServices: serviceCountMap.get(user.id) || 0,
        fileUrl: user.fileUrl,
        referralCode: user.referralCode || undefined,
        address: user.address
          ? {
              id: user.address.id,
              city: user.address.city ?? undefined,
              state: user.address.state ?? undefined,
            }
          : undefined,
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
      data: { status: user.status === 'Active' ? 'Inactive' : 'Active' },
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

  async getProvidersRankingByLocation(state?: string, city?: string) {
    const stateFilter = state ? Prisma.sql`AND a.state = ${state}` : Prisma.empty;
    const cityFilter = city ? Prisma.sql`AND a.city = ${city}` : Prisma.empty;

    type ProviderRankingRow = {
      city: string | null;
      state: string | null;
      totalProviders: bigint;
      totalServices: bigint;
    };

    const rows = (await this._prisma.$queryRaw`
    SELECT a.city, a.state,
           COUNT(DISTINCT u.id) AS totalProviders,
           COUNT(s.id) AS totalServices
    FROM users u
    INNER JOIN addresses a ON a.id = u.addressId
    INNER JOIN services s ON s.userId = u.id AND s.isActive = true
    WHERE u.role = 'User'
      ${stateFilter}
      ${cityFilter}
    GROUP BY a.city, a.state
    ORDER BY totalServices DESC
  `) as ProviderRankingRow[];

    return {
      ranking: rows.map((row, index) => ({
        position: index + 1,
        city: row.city ?? undefined,
        state: row.state ?? undefined,
        totalProviders: Number(row.totalProviders),
        totalServices: Number(row.totalServices),
      })),
      totalRecords: rows.length,
    };
  }
}
