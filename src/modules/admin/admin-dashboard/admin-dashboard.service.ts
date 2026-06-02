import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { PaymentStatusEnum, Role } from '@prisma/client';
import { ResponseDashboardCardsDto } from './dto/response-dashboard-cards.dto';
import {
  DashboardChartMonthDto,
  ResponseDashboardChartDto,
} from './dto/response-dashboard-chart.dto';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly _prisma: PrismaService) {}

  async getCards(): Promise<ResponseDashboardCardsDto> {
    const [totalUsers, totalServices, cashAgg] = await Promise.all([
      this._prisma.user.count({ where: { role: Role.User } }),
      this._prisma.service.count({ where: { isActive: true } }),
      this._prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatusEnum.Paid },
      }),
    ]);

    return {
      totalUsers,
      totalServices,
      totalCashValue: Number(cashAgg._sum.amount ?? 0),
    };
  }

  async getChart(year?: number): Promise<ResponseDashboardChartDto> {
    const targetYear = year ?? new Date().getFullYear();

    type MonthRow = { month: number; count: bigint };

    const [userRows, serviceRows] = await Promise.all([
        this._prisma.$queryRaw<MonthRow[]>`
          SELECT MONTH(createdAt) AS month, COUNT(*) AS count
          FROM users
          WHERE role = 'User'
            AND YEAR(createdAt) = ${targetYear}
          GROUP BY MONTH(createdAt)
        `,
        this._prisma.$queryRaw<MonthRow[]>`
          SELECT MONTH(createdAt) AS month, COUNT(*) AS count
          FROM services
          WHERE isActive = 1
            AND YEAR(createdAt) = ${targetYear}
          GROUP BY MONTH(createdAt)
        `,
    ]);

    const userMap = new Map(userRows.map((r) => [Number(r.month), Number(r.count)]));
      
    const serviceMap = new Map(serviceRows.map((r) => [Number(r.month), Number(r.count)]));

    const data: DashboardChartMonthDto[] = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return {
            month,
            users: userMap.get(month) ?? 0,
            services: serviceMap.get(month) ?? 0,
      };
    });

    return { year: targetYear, data };
  }
}
