import { PrismaService } from '@database/PrismaService';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewTypeEnum, SubscriptionStatusEnum, UserProfileType } from '@prisma/client';
import { AddSubscriptionBonusDto } from './dto/add-subscription-bonus.dto';
import { QueryAdminProviderHistoryDto } from './dto/query-admin-provider-history.dto';
import { QueryAdminProviderDto } from './dto/query-admin-provider.dto';
import { ResponseAdminProviderHistoryDto } from './dto/response-admin-provider-history.dto';
import { ResponseAdminProviderDto } from './dto/response-admin-provider.dto';
import { ResponseFindAllAdminProviderDto } from './dto/response-admin-provider-list.dto';
import { ResponseSubscriptionBonusDto } from './dto/response-subscription-bonus.dto';
import { GrantSubscriptionDto } from './dto/grant-subscription.dto';
import { ResponseGrantedSubscriptionDto } from './dto/response-granted-subscription.dto';

@Injectable()
export class AdminProvidersService {
  constructor(private readonly _prisma: PrismaService) {}

  async findAll(query: QueryAdminProviderDto): Promise<ResponseFindAllAdminProviderDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      profileType: UserProfileType.Supplier,
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
      : { services: { _count: 'desc' } };

    const [providers, totalRecords] = await Promise.all([
      this._prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          fileUrl: true,
          status: true,
          _count: { select: { services: { where: { isActive: true } } } },
        },
        orderBy,
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.user.count({ where }),
    ]);

    const offset = (currentPage - 1) * take;

    return {
      providers: providers.map((p, index) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone ?? undefined,
        fileUrl: p.fileUrl ?? undefined,
        ranking: offset + index + 1,
        totalServices: p._count.services,
        status: p.status,
      })),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseAdminProviderDto> {
    const provider = await this._prisma.user.findFirst({
      where: { id, profileType: UserProfileType.Supplier },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        document: true,
        birthDate: true,
        fileUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { services: { where: { isActive: true } } } },
      },
    });

    if (!provider) throw new NotFoundException('Fornecedor não encontrado.');

    const serviceIds = await this._prisma.service
      .findMany({ where: { userId: id }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id));

    const reviewCounts =
      serviceIds.length > 0
        ? await this._prisma.review.groupBy({
            by: ['type'],
            where: { serviceId: { in: serviceIds } },
            _count: { _all: true },
          })
        : [];

    const positiveReviews =
      reviewCounts.find((r) => r.type === ReviewTypeEnum.Positive)?._count._all ?? 0;
    const negativeReviews =
      reviewCounts.find((r) => r.type === ReviewTypeEnum.Negative)?._count._all ?? 0;

    const totalReviews = positiveReviews + negativeReviews;
    const averageRating =
      totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 5 * 10) / 10 : 0;

    return {
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone ?? undefined,
      document: provider.document ?? undefined,
      birthDate: provider.birthDate ?? undefined,
      fileUrl: provider.fileUrl ?? undefined,
      status: provider.status,
      openServices: provider._count.services,
      positiveReviews,
      negativeReviews,
      totalReviews,
      averageRating,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  async findHistory(
    id: number,
    query: QueryAdminProviderHistoryDto,
  ): Promise<ResponseAdminProviderHistoryDto> {
    const providerExists = await this._prisma.user.findFirst({
      where: { id, profileType: UserProfileType.Supplier },
      select: { id: true },
    });
    if (!providerExists) throw new NotFoundException('Fornecedor não encontrado.');

    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;
    const where: Prisma.WorkWhereInput = { providerId: id };

    const sortField = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDirection ?? 'desc';

    const [works, totalRecords] = await Promise.all([
      this._prisma.work.findMany({
        where,
        select: {
          id: true,
          serviceDate: true,
          totalValue: true,
          status: true,
          createdAt: true,
          service: { select: { name: true, description: true } },
          requester: { select: { name: true, fileUrl: true } },
        },
        orderBy: { [sortField]: sortDir } as Prisma.WorkOrderByWithRelationInput,
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.work.count({ where }),
    ]);

    return {
      history: works.map((w) => ({
        workId: w.id,
        serviceName: w.service.name,
        serviceDescription: w.service.description ?? undefined,
        requesterName: w.requester.name,
        requesterFileUrl: w.requester.fileUrl ?? undefined,
        totalValue: w.totalValue ? Number(w.totalValue) : undefined,
        status: w.status,
        serviceDate: w.serviceDate ?? undefined,
        createdAt: w.createdAt,
      })),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  /**
   * Concede assinatura ativa a um fornecedor, sem pagamento.
   *
   * Existe porque não havia caminho para isso: a assinatura nasce `Pending` e
   * só é ativada pelo webhook do provedor de pagamento. Sem esta rota, nenhum
   * ambiente de teste consegue um fornecedor operante, e nenhuma cortesia
   * comercial pode ser dada sem mexer no banco à mão.
   *
   * A concessão fica marcada com quem a fez e por quê. Sem isso ela seria
   * indistinguível de uma assinatura paga, e a diferença importa: uma entrou
   * dinheiro, a outra não.
   *
   * `amount` vai zerado porque nada foi cobrado. Nenhum lançamento financeiro é
   * criado — o razão continua refletindo só o que de fato entrou.
   */
  async grantSubscription(
    adminId: number,
    providerId: number,
    payload: GrantSubscriptionDto,
  ): Promise<ResponseGrantedSubscriptionDto> {
    const provider = await this._prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true },
    });

    if (!provider) throw new NotFoundException('Fornecedor não encontrado.');

    const plan = await this._prisma.plan.findUnique({
      where: { id: payload.planId },
      select: { id: true, name: true, interval: true, intervalCount: true },
    });

    if (!plan) throw new NotFoundException('Plano não encontrado.');

    // Uma assinatura ativa por vez. Conceder por cima criaria duas válidas ao
    // mesmo tempo, e o guard passaria a depender de qual o banco devolvesse
    // primeiro. Para esticar uma concessão existente há a rota de bônus.
    const active = await this._prisma.subscription.findFirst({
      where: {
        userId: providerId,
        status: SubscriptionStatusEnum.Active,
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: new Date() } }],
      },
      select: { id: true },
    });

    if (active) {
      throw new ConflictException(
        `Este fornecedor já possui a assinatura #${active.id} ativa. ` +
          'Para estender a validade, use a rota de bônus.',
      );
    }

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setMonth(endsAt.getMonth() + payload.months);

    const subscription = await this._prisma.subscription.create({
      data: {
        userId: providerId,
        planId: plan.id,
        status: SubscriptionStatusEnum.Active,
        amount: 0,
        planName: plan.name,
        planInterval: plan.interval,
        intervalCount: plan.intervalCount,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: endsAt,
        grantedById: adminId,
        grantReason: payload.reason?.trim() || null,
      },
      select: {
        id: true,
        planName: true,
        status: true,
        currentPeriodEnd: true,
        grantedById: true,
        grantReason: true,
      },
    });

    return {
      subscriptionId: subscription.id,
      providerId,
      planName: subscription.planName,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      grantedById: subscription.grantedById,
      grantReason: subscription.grantReason ?? undefined,
    };
  }

  async addSubscriptionBonus(
    providerId: number,
    subscriptionId: number,
    payload: AddSubscriptionBonusDto,
  ): Promise<ResponseSubscriptionBonusDto> {
    const subscription = await this._prisma.subscription.findFirst({
      where: { id: subscriptionId, userId: providerId },
      select: {
        id: true,
        status: true,
        bonusMonths: true,
        currentPeriodEnd: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada para este fornecedor.');
    }

    const baseDate = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : new Date();
    baseDate.setMonth(baseDate.getMonth() + payload.months);

    const updated = await this._prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        bonusMonths: subscription.bonusMonths + payload.months,
        currentPeriodEnd: baseDate,
      },
      select: {
        id: true,
        status: true,
        bonusMonths: true,
        currentPeriodEnd: true,
      },
    });

    return {
      subscriptionId: updated.id,
      totalBonusMonths: updated.bonusMonths,
      currentPeriodEnd: updated.currentPeriodEnd,
      status: updated.status,
    };
  }
}
