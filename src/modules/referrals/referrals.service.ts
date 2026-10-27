import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { ResponseMyReferralsDto } from './dto/response-my-referrals.dto';
import { ResponseMyReferralsSummaryDto } from './dto/response-my-referrals-summary.dto';
import { buildReferralCode } from './referral-code';

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
      referralCode: await this.ensureReferralCode(user),
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
      referralCode: await this.ensureReferralCode(user),
      totalReferrals,
      totalPaying,
      accumulatedCommission: Number(accumulatedCommission._sum.commissionAmount ?? 0),
      rankingPosition,
      commissionRate: customRate,
      effectiveCommissionRate: customRate !== null ? customRate : globalRate,
    };
  }

  /**
   * Código de indicação do influencer, gerado na primeira leitura se faltar.
   *
   * O cadastro já gera um código para quem passa por `POST /no-auth/register/*`,
   * mas conta criada por outro caminho — seed, carga, importação — nasce com a
   * coluna nula. Nesse caso a tela "Meu link" vinha vazia e ninguém conseguia
   * se cadastrar indicado, sem erro nenhum para explicar.
   *
   * A gravação é condicional (`referralCode: null` no `where`) de propósito: se
   * duas requisições chegarem juntas, só a primeira grava e a segunda devolve o
   * código que ficou. Sem isso, a segunda sobrescreveria o código da primeira —
   * e um link já compartilhado deixaria de funcionar.
   */
  private async ensureReferralCode(user: User): Promise<string> {
    if (user.referralCode) return user.referralCode;

    const codigo = buildReferralCode(user.name);

    const gravados = await this.prisma.user.updateMany({
      where: { id: user.id, referralCode: null },
      data: { referralCode: codigo },
    });

    if (gravados.count > 0) return codigo;

    const atual = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { referralCode: true },
    });

    return atual?.referralCode ?? codigo;
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
