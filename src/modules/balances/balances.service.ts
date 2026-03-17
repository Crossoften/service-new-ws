import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { BudgetStatus } from '../budgets/enums/budget-status.enum';
import { ResponseBalanceOverviewDto } from './dto/response-balance-overview.dto';
import { ResponseBalanceReceiptsDto } from './dto/response-balance-receipts.dto';
import { FinancialTransactionCategory } from '../works/enums/financial-transaction-category.enum';
import { FinancialTransactionType } from '../works/enums/financial-transaction-type.enum';
import { PaymentReferenceType } from '../works/enums/payment-reference-type.enum';
import { PaymentStatus } from '../works/enums/payment-status.enum';
import { PaymentMethod } from '../works/enums/payment-method.enum';

@Injectable()
export class BalancesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly recentBudgetSelect = Prisma.validator<Prisma.BudgetSelect>()({
    id: true,
    description: true,
    status: true,
    createdAt: true,
    requester: {
      select: {
        id: true,
        name: true,
        fileUrl: true,
      },
    },
    service: {
      select: {
        id: true,
        name: true,
      },
    },
  });

  private readonly recentReceiptSelect = Prisma.validator<Prisma.FinancialTransactionSelect>()({
    id: true,
    amount: true,
    description: true,
    availableAt: true,
    createdAt: true,
    referenceId: true,
    payment: {
      select: {
        method: true,
        payer: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
          },
        },
      },
    },
  });

  async findOverview(user: User): Promise<ResponseBalanceOverviewDto> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [recentBudgets, creditAggregate, debitAggregate] = await Promise.all([
      this.prisma.budget.findMany({
        where: { providerId: user.id },
        select: this.recentBudgetSelect,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          userId: user.id,
          type: FinancialTransactionType.Credit,
          status: PaymentStatus.Paid,
          OR: [
            {
              availableAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
            {
              availableAt: null,
              createdAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
          ],
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          userId: user.id,
          type: FinancialTransactionType.Debit,
          status: PaymentStatus.Paid,
          OR: [
            {
              availableAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
            {
              availableAt: null,
              createdAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
          ],
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalCredits = creditAggregate._sum.amount ? Number(creditAggregate._sum.amount) : 0;
    const totalDebits = debitAggregate._sum.amount ? Number(debitAggregate._sum.amount) : 0;

    return {
      currentMonthBalance: (totalCredits - totalDebits).toFixed(2),
      recentBudgets: recentBudgets.map((budget) => ({
        id: budget.id,
        description: budget.description || undefined,
        status: budget.status as BudgetStatus,
        createdAt: budget.createdAt,
        requester: {
          id: budget.requester.id,
          name: budget.requester.name,
          fileUrl: budget.requester.fileUrl || undefined,
        },
        service: {
          id: budget.service ? budget.service.id : 0,
          name: budget.service ? budget.service.name : 'Serviço removido',
        },
      })),
    };
  }

  async findReceipts(user: User): Promise<ResponseBalanceReceiptsDto> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [recentReceipts, creditAggregate, debitAggregate] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: {
          userId: user.id,
          type: FinancialTransactionType.Credit,
          category: FinancialTransactionCategory.WorkPayment,
          status: PaymentStatus.Paid,
          referenceType: PaymentReferenceType.Work,
        },
        select: this.recentReceiptSelect,
        orderBy: [{ availableAt: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          userId: user.id,
          type: FinancialTransactionType.Credit,
          status: PaymentStatus.Paid,
          OR: [
            {
              availableAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
            {
              availableAt: null,
              createdAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
          ],
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          userId: user.id,
          type: FinancialTransactionType.Debit,
          status: PaymentStatus.Paid,
          OR: [
            {
              availableAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
            {
              availableAt: null,
              createdAt: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
          ],
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const workIds = recentReceipts.map((transaction) => transaction.referenceId);
    const works = workIds.length
      ? await this.prisma.work.findMany({
          where: { id: { in: workIds } },
          select: {
            id: true,
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];

    const workMap = new Map(
      works.map((work) => [
        work.id,
        {
          id: work.service.id,
          name: work.service.name,
        },
      ]),
    );

    const totalCredits = creditAggregate._sum.amount ? Number(creditAggregate._sum.amount) : 0;
    const totalDebits = debitAggregate._sum.amount ? Number(debitAggregate._sum.amount) : 0;

    return {
      currentMonthBalance: (totalCredits - totalDebits).toFixed(2),
      recentReceipts: recentReceipts.map((transaction) => ({
        id: transaction.id,
        amount: transaction.amount.toFixed(2),
        description: transaction.description || undefined,
        method: transaction.payment ? (transaction.payment.method as PaymentMethod) : undefined,
        availableAt: transaction.availableAt || undefined,
        createdAt: transaction.createdAt,
        payer: {
          id: transaction.payment ? transaction.payment.payer.id : 0,
          name: transaction.payment ? transaction.payment.payer.name : 'Cliente removido',
          fileUrl:
            transaction.payment && transaction.payment.payer.fileUrl
              ? transaction.payment.payer.fileUrl
              : undefined,
        },
        service: workMap.get(transaction.referenceId),
      })),
    };
  }
}
