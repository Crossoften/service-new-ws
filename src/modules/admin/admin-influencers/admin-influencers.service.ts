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

    const [influencers, totalRecords] = await Promise.all([
      this._prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          fileUrl: true,
          status: true,
          _count: { select: { referrals: true } },
        },
        orderBy: { referrals: { _count: 'desc' } },
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
        fileUrl: true,
        referralCode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!influencer) throw new NotFoundException('Influencer não encontrado.');

    const [referralStats, totalPaying, accumulatedCommission, rankingPosition] = await Promise.all([
      this._prisma.referral.count({ where: { influencerId: id } }),
      this._prisma.referral.count({ where: { influencerId: id, isPaying: true } }),
      this._prisma.referral.aggregate({
        where: { influencerId: id },
        _sum: { commissionAmount: true },
      }),
      this._getRankingPosition(id),
    ]);

    return {
      id: influencer.id,
      name: influencer.name,
      email: influencer.email,
      phone: influencer.phone ?? undefined,
      document: influencer.document ?? undefined,
      fileUrl: influencer.fileUrl ?? undefined,
      referralCode: influencer.referralCode ?? undefined,
      status: influencer.status,
      activeReferrals: totalPaying,
      stats: {
        totalReferrals: referralStats,
        totalPaying,
        accumulatedCommission: Number(accumulatedCommission._sum.commissionAmount ?? 0),
        rankingPosition,
      },
      createdAt: influencer.createdAt,
      updatedAt: influencer.updatedAt,
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
}
