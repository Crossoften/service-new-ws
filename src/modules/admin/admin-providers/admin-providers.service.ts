import { PrismaService } from '@database/PrismaService';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewTypeEnum, UserProfileType } from '@prisma/client';
import { QueryAdminProviderHistoryDto } from './dto/query-admin-provider-history.dto';
import { QueryAdminProviderDto } from './dto/query-admin-provider.dto';
import { ResponseAdminProviderHistoryDto } from './dto/response-admin-provider-history.dto';
import { ResponseAdminProviderDto } from './dto/response-admin-provider.dto';
import { ResponseFindAllAdminProviderDto } from './dto/response-admin-provider-list.dto';

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
        orderBy: { services: { _count: 'desc' } },
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

    return {
      id: provider.id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone ?? undefined,
      document: provider.document ?? undefined,
      fileUrl: provider.fileUrl ?? undefined,
      status: provider.status,
      openServices: provider._count.services,
      positiveReviews,
      negativeReviews,
      totalReviews: positiveReviews + negativeReviews,
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

    const [works, totalRecords] = await Promise.all([
      this._prisma.work.findMany({
        where,
        select: {
          id: true,
          serviceDate: true,
          totalValue: true,
          status: true,
          createdAt: true,
          service: { select: { name: true } },
          requester: { select: { name: true, fileUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.work.count({ where }),
    ]);

    return {
      history: works.map((w) => ({
        workId: w.id,
        serviceName: w.service.name,
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
}
