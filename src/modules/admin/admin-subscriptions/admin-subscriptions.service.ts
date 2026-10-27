import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, UserProfileType } from '@prisma/client';

import {
  QueryAdminSubscriptionDto,
  SubscriptionOriginFilter,
} from './dto/query-admin-subscription.dto';
import {
  AdminSubscriptionItemDto,
  ResponseFindAllAdminSubscriptionDto,
} from './dto/response-admin-subscription.dto';

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly _prisma: PrismaService) {}

  /**
   * Lista as assinaturas de todos os fornecedores.
   *
   * Existe porque as rotas administrativas de assinatura eram **todas por
   * fornecedor**: para saber o que já foi concedido era preciso abrir um
   * fornecedor por vez. Em ambiente de teste, onde a concessão é a forma de
   * liberar conta, isso não dá.
   *
   * `isCurrent` é calculado aqui, com o mesmo critério dos guards, para a tela
   * não reimplementar a regra.
   */
  async findAll(query: QueryAdminSubscriptionDto): Promise<ResponseFindAllAdminSubscriptionDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;
    const search = query.search?.trim();

    const where: Prisma.SubscriptionWhereInput = {
      // Só fornecedor: a assinatura é o que libera quem oferece serviço, e
      // misturar outros perfis faria a tela mostrar linha que não se concede.
      user: {
        profileType: UserProfileType.Supplier,
        ...(search && {
          OR: [{ name: { contains: search } }, { email: { contains: search } }],
        }),
      },
      ...(query.status && { status: query.status }),
      ...(query.providerId && { userId: query.providerId }),
      // `grantedById` é o que distingue concessão de assinatura paga — só a
      // rota de concessão preenche o campo.
      ...(query.origin === SubscriptionOriginFilter.Granted && { grantedById: { not: null } }),
      ...(query.origin === SubscriptionOriginFilter.Paid && { grantedById: null }),
    };

    const [subscriptions, totalRecords] = await Promise.all([
      this._prisma.subscription.findMany({
        where,
        select: {
          id: true,
          planName: true,
          planInterval: true,
          amount: true,
          status: true,
          categoryId: true,
          category: { select: { name: true } },
          grantedById: true,
          grantReason: true,
          bonusMonths: true,
          cancelAtPeriodEnd: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          grantedBy: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.subscription.count({ where }),
    ]);

    const now = new Date();

    return {
      subscriptions: subscriptions.map((subscription) =>
        this.toItem(subscription as Parameters<typeof this.toItem>[0], now),
      ),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  private toItem(
    subscription: {
      id: number;
      planName: string;
      planInterval: AdminSubscriptionItemDto['planInterval'];
      amount: Prisma.Decimal;
      status: AdminSubscriptionItemDto['status'];
      categoryId: number | null;
      category: { name: string } | null;
      grantedById: number | null;
      grantReason: string | null;
      bonusMonths: number;
      cancelAtPeriodEnd: boolean;
      currentPeriodStart: Date | null;
      currentPeriodEnd: Date | null;
      createdAt: Date;
      user: { id: number; name: string; email: string; phone: string | null };
      grantedBy: { id: number; name: string; email: string; phone: string | null } | null;
    },
    now: Date,
  ): AdminSubscriptionItemDto {
    return {
      subscriptionId: subscription.id,
      provider: {
        id: subscription.user.id,
        name: subscription.user.name,
        email: subscription.user.email,
        phone: subscription.user.phone ?? undefined,
      },
      planName: subscription.planName,
      planInterval: subscription.planInterval,
      amount: Number(subscription.amount),
      status: subscription.status,
      categoryId: subscription.categoryId ?? undefined,
      categoryName: subscription.category?.name ?? undefined,
      isGranted: subscription.grantedById !== null,
      grantedBy: subscription.grantedBy
        ? {
            id: subscription.grantedBy.id,
            name: subscription.grantedBy.name,
            email: subscription.grantedBy.email,
            phone: subscription.grantedBy.phone ?? undefined,
          }
        : undefined,
      grantReason: subscription.grantReason ?? undefined,
      bonusMonths: subscription.bonusMonths,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart ?? undefined,
      currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
      isCurrent:
        subscription.status === 'Active' &&
        (subscription.currentPeriodEnd === null || subscription.currentPeriodEnd >= now),
      createdAt: subscription.createdAt,
    };
  }
}
