import { PrismaService } from '@database/PrismaService';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserProfileType } from '@prisma/client';
import { QueryAdminInfluencerDto } from './dto/query-admin-influencer.dto';
import { ResponseAdminInfluencerDto } from './dto/response-admin-influencer.dto';
import { ResponseFindAllAdminInfluencerDto } from './dto/response-admin-influencer-list.dto';

@Injectable()
export class AdminInfluencersService {
  constructor(private readonly _prisma: PrismaService) {}

  async findAll(query: QueryAdminInfluencerDto): Promise<ResponseFindAllAdminInfluencerDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      profileType: UserProfileType.Influencer,
      ...(query.status && { status: query.status }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
    };

    const sortDir = query.sortDirection ?? 'desc';
    const orderBy: Prisma.UserOrderByWithRelationInput = query.sortBy
      ? ({ [query.sortBy]: sortDir } as Prisma.UserOrderByWithRelationInput)
      : { referrals: { _count: 'desc' } };

    const [influencers, totalRecords] = await Promise.all([
      this._prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          commissionRate: true,
          email: true,
          phone: true,
          fileUrl: true,
          status: true,
          _count: { select: { referrals: true } },
        },
        orderBy,
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.user.count({ where }),
    ]);

    const offset = (currentPage - 1) * take;

    return {
      influencers: influencers.map((inf, index) => ({
        id: inf.id,
        name: inf.name,
        email: inf.email,
        phone: inf.phone ?? undefined,
        fileUrl: inf.fileUrl ?? undefined,
        ranking: offset + index + 1,
        totalReferrals: inf._count.referrals,
        status: inf.status,
        commissionRate: inf.commissionRate ?? undefined,
      })),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseAdminInfluencerDto> {
    const influencer = await this._prisma.user.findFirst({
      where: { id, profileType: UserProfileType.Influencer },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        document: true,
        birthDate: true,
        fileUrl: true,
        referralCode: true,
        commissionRate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        socialMedias: { select: { network: true, url: true, followers: true } },
      },
    });

    if (!influencer) throw new NotFoundException('Influencer não encontrado.');

    const [referralStats, totalPaying, accumulatedCommission, rankingPosition, platformSettings] =
      await Promise.all([
        this._prisma.referral.count({ where: { influencerId: id } }),
        this._prisma.referral.count({ where: { influencerId: id, isPaying: true } }),
        this._prisma.referral.aggregate({
          where: { influencerId: id },
          _sum: { commissionAmount: true },
        }),
        this._getRankingPosition(id),
        this._prisma.platformSettings.findUnique({ where: { id: 1 } }),
      ]);

    const globalRate = platformSettings ? Number(platformSettings.influencerCommissionRate) : 10;
    const customRate = influencer.commissionRate ? Number(influencer.commissionRate) : null;

    return {
      id: influencer.id,
      name: influencer.name,
      email: influencer.email,
      phone: influencer.phone ?? undefined,
      document: influencer.document ?? undefined,
      birthDate: influencer.birthDate ?? undefined,
      fileUrl: influencer.fileUrl ?? undefined,
      referralCode: influencer.referralCode ?? undefined,
      commissionRate: customRate,
      effectiveCommissionRate: customRate !== null ? customRate : globalRate,
      status: influencer.status,
      activeReferrals: totalPaying,
      stats: {
        totalReferrals: referralStats,
        totalPaying,
        accumulatedCommission: Number(accumulatedCommission._sum.commissionAmount ?? 0),
        rankingPosition,
      },
      socialMedias: influencer.socialMedias,
      createdAt: influencer.createdAt,
      updatedAt: influencer.updatedAt,
    };
  }

  async updateCommission(
    id: number,
    commissionRate: number | null,
  ): Promise<{ message: string; id: number }> {
    const influencer = await this._prisma.user.findFirst({
      where: { id, profileType: UserProfileType.Influencer },
      select: { id: true },
    });

    if (!influencer) throw new NotFoundException('Influencer não encontrado.');

    await this._prisma.user.update({
      where: { id },
      data: { commissionRate: commissionRate !== null ? commissionRate : null },
    });

    return {
      message: 'Comissão atualizada com sucesso',
      id: id,
    };
  }

  private async _getRankingPosition(influencerId: number): Promise<number> {
    type RankRow = { influencerId: number; total: bigint };

    const rows = await this._prisma.$queryRaw<RankRow[]>`
      SELECT influencerId, COUNT(*) AS total
      FROM referrals
      GROUP BY influencerId
      ORDER BY total DESC
    `;

    const index = rows.findIndex((r) => Number(r.influencerId) === influencerId);
    return index === -1 ? rows.length + 1 : index + 1;
  }

  async findReferralsById(id: number) {
    const influencer = await this._prisma.user.findFirst({
      where: { id, profileType: UserProfileType.Influencer },
      select: { id: true, name: true, referralCode: true },
    });

    if (!influencer) throw new NotFoundException('Influencer não encontrado.');

    const referrals = await this._prisma.referral.findMany({
      where: { influencerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileType: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      influencer: {
        id: influencer.id,
        name: influencer.name,
        referralCode: influencer.referralCode,
      },
      referrals: referrals.map((ref) => ({
        id: ref.id,
        status: ref.isPaying ? 'Convertido' : 'Aguardando Pagamento',
        commissionAmount: ref.commissionAmount ? Number(ref.commissionAmount) : null,
        paidAt: ref.paidAt,
        createdAt: ref.createdAt,
        referredUser: {
          id: ref.referredUser.id,
          name: ref.referredUser.name,
          email: ref.referredUser.email,
          phone: ref.referredUser.phone ?? undefined,
          profileType: ref.referredUser.profileType,
          status: ref.referredUser.status,
          registeredAt: ref.referredUser.createdAt,
        },
      })),
      totalRecords: referrals.length,
    };
  }

  async getRankingByLocation(state?: string, city?: string) {
    const stateFilter = state ? Prisma.sql`AND a.state = ${state}` : Prisma.empty;
    const cityFilter = city ? Prisma.sql`AND a.city = ${city}` : Prisma.empty;

    type RankingRow = {
      city: string | null;
      state: string | null;
      totalInfluencers: bigint;
      totalReferrals: bigint;
    };

    const rows = (await this._prisma.$queryRaw`
    SELECT a.city, a.state,
           COUNT(DISTINCT u.id) AS totalInfluencers,
           COUNT(r.id) AS totalReferrals
    FROM users u
    INNER JOIN addresses a ON a.id = u.addressId
    LEFT JOIN referrals r ON r.influencerId = u.id
    WHERE u.profileType = 'Influencer'
      ${stateFilter}
      ${cityFilter}
    GROUP BY a.city, a.state
    ORDER BY totalReferrals DESC
  `) as RankingRow[];

    return {
      ranking: rows.map((row, index) => ({
        position: index + 1,
        city: row.city ?? undefined,
        state: row.state ?? undefined,
        totalInfluencers: Number(row.totalInfluencers),
        totalReferrals: Number(row.totalReferrals),
      })),
      totalRecords: rows.length,
    };
  }
}
