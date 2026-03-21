import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseBooleanString } from '@utils/parseBooleanString';
import { parsePositiveInt } from '@utils/parsePositiveInt';
import { parsePriceDecimal } from '@utils/parsePriceDecimal';
import { CreatePlanDto } from './dto/create-plan.dto';
import { QueryPlanDto } from './dto/query-plan.dto';
import { ResponseFindAllPlansDto, ResponsePlanDto } from './dto/response-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SubscriptionIntervalEnum } from '../enums/subscription-interval.enum';
import { PlanNotFoundException } from './exceptions/plan-not-found.exception';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly planSelect = Prisma.validator<Prisma.PlanSelect>()({
    id: true,
    name: true,
    slug: true,
    description: true,
    price: true,
    interval: true,
    intervalCount: true,
    benefits: true,
    isActive: true,
    sortOrder: true,
    createdAt: true,
    updatedAt: true,
  });

  async create(payload: CreatePlanDto): Promise<ResponsePlanDto> {
    const plan = await this.prisma.plan.create({
      data: {
        name: payload.name.trim(),
        slug: payload.slug.trim(),
        description: payload.description?.trim() || null,
        price: parsePriceDecimal(payload.price),
        interval: payload.interval,
        intervalCount: parsePositiveInt(payload.intervalCount, 'intervalCount'),
        benefits: payload.benefits || [],
        isActive:
          payload.isActive !== undefined ? parseBooleanString(payload.isActive, 'isActive') : true,
        sortOrder: payload.sortOrder ? parsePositiveInt(payload.sortOrder, 'sortOrder') : 0,
      },
      select: this.planSelect,
    });

    return this.toResponse(plan);
  }

  async findAll(query: QueryPlanDto, onlyActive = false): Promise<ResponseFindAllPlansDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const search = query.search?.trim() || undefined;
    const isActive = onlyActive
      ? true
      : query.isActive !== undefined
        ? parseBooleanString(query.isActive, 'isActive')
        : undefined;

    const where: Prisma.PlanWhereInput = {
      isActive,
      OR: search
        ? [{ name: { contains: search } }, { description: { contains: search } }]
        : undefined,
    };

    const [plans, totalRecords] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        select: this.planSelect,
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }, { createdAt: 'asc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.plan.count({ where }),
    ]);

    return {
      plans: plans.map((plan) => this.toResponse(plan)),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponsePlanDto> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      select: this.planSelect,
    });

    if (!plan) {
      throw new PlanNotFoundException();
    }

    return this.toResponse(plan);
  }

  async update(id: number, payload: UpdatePlanDto): Promise<ResponsePlanDto> {
    await this.findById(id);

    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        name: payload.name?.trim(),
        slug: payload.slug?.trim(),
        description:
          payload.description !== undefined ? payload.description?.trim() || null : undefined,
        price: payload.price ? parsePriceDecimal(payload.price) : undefined,
        interval: payload.interval as SubscriptionIntervalEnum | undefined,
        intervalCount: payload.intervalCount
          ? parsePositiveInt(payload.intervalCount, 'intervalCount')
          : undefined,
        benefits: payload.benefits,
        isActive:
          payload.isActive !== undefined
            ? parseBooleanString(payload.isActive, 'isActive')
            : undefined,
        sortOrder: payload.sortOrder ? parsePositiveInt(payload.sortOrder, 'sortOrder') : undefined,
      },
      select: this.planSelect,
    });

    return this.toResponse(plan);
  }

  async delete(id: number): Promise<{ message: string }> {
    await this.findById(id);
    await this.prisma.plan.delete({ where: { id } });

    return { message: 'Plano removido com sucesso.' };
  }

  private toResponse(plan: any): ResponsePlanDto {
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description || undefined,
      price: plan.price.toFixed(2),
      interval: plan.interval as SubscriptionIntervalEnum,
      intervalCount: plan.intervalCount,
      benefits: Array.isArray(plan.benefits) ? plan.benefits.map((item: any) => String(item)) : [],
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
