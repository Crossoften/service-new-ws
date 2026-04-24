import { PrismaService } from '@database/PrismaService';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewTypeEnum } from '@prisma/client';
import { QueryAdminServiceClientsDto } from './dto/query-admin-service-clients.dto';
import { QueryAdminServiceDto } from './dto/query-admin-service.dto';
import { ResponseAdminServiceClientsDto } from './dto/response-admin-service-clients.dto';
import { ResponseAdminServiceDto } from './dto/response-admin-service.dto';
import { ResponseFindAllAdminServiceDto } from './dto/response-admin-service-list.dto';

@Injectable()
export class AdminServicesService {
  constructor(private readonly _prisma: PrismaService) {}

  private readonly serviceSelect = Prisma.validator<Prisma.ServiceSelect>()({
    id: true,
    name: true,
    type: true,
    registrationCode: true,
    price: true,
    description: true,
    imageUrl: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true, iconUrl: true } },
    user: { select: { id: true, name: true, email: true, phone: true, fileUrl: true } },
    _count: { select: { works: true } },
  });

  private async getReviewCounts(serviceIds: number[]) {
    if (serviceIds.length === 0) return new Map<number, { positive: number; negative: number }>();

    const rows = await this._prisma.review.groupBy({
      by: ['serviceId', 'type'],
      where: { serviceId: { in: serviceIds } },
      _count: { _all: true },
    });

    const map = new Map<number, { positive: number; negative: number }>();
    for (const row of rows) {
      const sid = row.serviceId!;
      if (!map.has(sid)) map.set(sid, { positive: 0, negative: 0 });
      const entry = map.get(sid)!;
      if (row.type === ReviewTypeEnum.Positive) entry.positive = row._count._all;
      else entry.negative = row._count._all;
    }
    return map;
  }

  async findAll(query: QueryAdminServiceDto): Promise<ResponseFindAllAdminServiceDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;
    const search = query.search?.trim();

    const where: Prisma.ServiceWhereInput = {
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.type && { type: query.type }),
      ...(search && { name: { contains: search } }),
    };

    const [services, totalRecords] = await Promise.all([
      this._prisma.service.findMany({
        where,
        select: this.serviceSelect,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.service.count({ where }),
    ]);

    const reviewMap = await this.getReviewCounts(services.map((s) => s.id));

    return {
      services: services.map((s) => {
        const reviews = reviewMap.get(s.id) ?? { positive: 0, negative: 0 };
        return {
          id: s.id,
          name: s.name,
          type: s.type,
          category: { id: s.category.id, name: s.category.name },
          provider: { id: s.user.id, name: s.user.name, fileUrl: s.user.fileUrl ?? undefined },
          price: Number(s.price),
          totalReviews: reviews.positive + reviews.negative,
          positiveReviews: reviews.positive,
          negativeReviews: reviews.negative,
          isActive: s.isActive,
        };
      }),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseAdminServiceDto> {
    const [service, reviewMap] = await Promise.all([
      this._prisma.service.findUnique({ where: { id }, select: this.serviceSelect }),
      this.getReviewCounts([id]),
    ]);

    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    const reviews = reviewMap.get(id) ?? { positive: 0, negative: 0 };

    return {
      id: service.id,
      name: service.name,
      type: service.type,
      registrationCode: service.registrationCode ?? undefined,
      price: Number(service.price),
      description: service.description ?? undefined,
      imageUrl: service.imageUrl ?? undefined,
      isActive: service.isActive,
      category: {
        id: service.category.id,
        name: service.category.name,
        iconUrl: service.category.iconUrl ?? undefined,
      },
      provider: {
        id: service.user.id,
        name: service.user.name,
        email: service.user.email,
        phone: service.user.phone ?? undefined,
        fileUrl: service.user.fileUrl ?? undefined,
      },
      totalReviews: reviews.positive + reviews.negative,
      positiveReviews: reviews.positive,
      negativeReviews: reviews.negative,
      totalWorks: service._count.works,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  async findClients(
    id: number,
    query: QueryAdminServiceClientsDto,
  ): Promise<ResponseAdminServiceClientsDto> {
    const serviceExists = await this._prisma.service.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!serviceExists) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const where: Prisma.WorkWhereInput = { serviceId: id };

    const [works, totalRecords] = await Promise.all([
      this._prisma.work.findMany({
        where,
        select: {
          id: true,
          serviceDate: true,
          totalValue: true,
          status: true,
          createdAt: true,
          requester: { select: { id: true, name: true, fileUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this._prisma.work.count({ where }),
    ]);

    const requesterIds = works.map((w) => w.requester.id);
    const reviews =
      requesterIds.length > 0
        ? await this._prisma.review.findMany({
            where: { serviceId: id, requesterId: { in: requesterIds } },
            select: { requesterId: true },
          })
        : [];

    const reviewSet = new Set(reviews.map((r) => r.requesterId));

    return {
      clients: works.map((w) => ({
        workId: w.id,
        serviceDate: w.serviceDate ?? undefined,
        createdAt: w.createdAt,
        clientName: w.requester.name,
        clientFileUrl: w.requester.fileUrl ?? undefined,
        totalValue: w.totalValue ? Number(w.totalValue) : undefined,
        status: w.status,
        hasReview: reviewSet.has(w.requester.id),
      })),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }
}
