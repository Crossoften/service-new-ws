import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { ResponseMyReferralsDto } from './dto/response-my-referrals.dto';
import { ResponseMyReferralsSummaryDto } from './dto/response-my-referrals-summary.dto';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyReferrals(user: User): Promise<ResponseMyReferralsDto> {
    const referrals = await this.prisma.referral.findMany({
      where: { influencerId: user.id },
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
      referralCode: user.referralCode ?? undefined,
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

  async findMySummary(user: User): Promise<ResponseMyReferralsSummaryDto> {
    const [totalReferrals, totalPaying, accumulatedCommission, rankingPosition, platformSettings] =
      await Promise.all([
        this.prisma.referral.count({ where: { influencerId: user.id } }),
        this.prisma.referral.count({ where: { influencerId: user.id, isPaying: true } }),
        this.prisma.referral.aggregate({
          where: { influencerId: user.id },
          _sum: { commissionAmount: true },
        }),
        this._getRankingPosition(user.id),
        this.prisma.platformSettings.findUnique({ where: { id: 1 } }),
      ]);

    const globalRate = platformSettings ? Number(platformSettings.influencerCommissionRate) : 10;
    const customRate = user.commissionRate ? Number(user.commissionRate) : null;

    return {
      referralCode: user.referralCode ?? undefined,
      totalReferrals,
      totalPaying,
      accumulatedCommission: Number(accumulatedCommission._sum.commissionAmount ?? 0),
      rankingPosition,
      commissionRate: customRate,
      effectiveCommissionRate: customRate !== null ? customRate : globalRate,
    };
  }

  private async _getRankingPosition(influencerId: number): Promise<number> {
    type RankRow = { influencerId: number; total: bigint };

    const rows = await this.prisma.$queryRaw<RankRow[]>`
      SELECT influencerId, COUNT(*) AS total
      FROM referrals
      GROUP BY influencerId
      ORDER BY total DESC
    `;

    const index = rows.findIndex((r) => Number(r.influencerId) === influencerId);
    return index === -1 ? rows.length + 1 : index + 1;
  }
}
