import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreatePlanDto } from './dto/create-plan.dto';
import { QueryPlanDto } from './dto/query-plan.dto';
import { ResponseFindAllPlansDto, ResponsePlanDto } from './dto/response-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SubscriptionIntervalEnum } from '../enums/subscription-interval.enum';
import { PlanNotFoundException } from './exceptions/plan-not-found.exception';

type PlanRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: Prisma.Decimal;
  interval: string;
  intervalCount: number;
  bonusMonths: number;
  isActive: boolean;
  sortOrder: number;
  categoryId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) { }

  private readonly planSelect = Prisma.validator<Prisma.PlanSelect>()({
    id: true,
    name: true,
    slug: true,
    description: true,
    price: true,
    interval: true,
    intervalCount: true,
    bonusMonths: true,
    isActive: true,
    sortOrder: true,
    categoryId: true,
    createdAt: true,
    updatedAt: true,
  });

  private calcMonthlyPrice(
    price: Prisma.Decimal,
    interval: string,
    intervalCount: number,
    bonusMonths: number,
  ): string {
    const baseMonths =
      interval === SubscriptionIntervalEnum.Year ? intervalCount * 12 : intervalCount;
    const totalMonths = baseMonths + bonusMonths;
    if (totalMonths <= 0) {
      return price.toFixed(2);
    }
    return (price.toNumber() / totalMonths).toFixed(2);
  }

  private mapPlan(plan: PlanRow): ResponsePlanDto {
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description || undefined,
      price: plan.price.toFixed(2),
      interval: plan.interval as SubscriptionIntervalEnum,
      intervalCount: plan.intervalCount,
      bonusMonths: plan.bonusMonths,
      categoryId: plan.categoryId ?? undefined,
      monthlyPrice: this.calcMonthlyPrice(
        plan.price,
        plan.interval,
        plan.intervalCount,
        plan.bonusMonths,
      ),
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  async create(payload: CreatePlanDto): Promise<ResponsePlanDto> {
    const plan = await this.prisma.plan.create({
      data: {
        name: payload.name.trim(),
        slug: payload.slug.trim(),
        description: payload.description?.trim() || null,
        price: new Prisma.Decimal(payload.price),
        interval: payload.interval,
        intervalCount: payload.intervalCount,
        bonusMonths: payload.bonusMonths ?? 0,
        isActive: payload.isActive ?? true,
        sortOrder: payload.sortOrder ?? 0,
        category: payload.categoryId
          ? { connect: { id: payload.categoryId } }
          : undefined,
      },
      select: this.planSelect,
    });

    return this.mapPlan(plan as PlanRow);
  }

  async findAll(query: QueryPlanDto, onlyActive = false): Promise<ResponseFindAllPlansDto> {
    const take = query.take ?? 10;
    const page = query.skip ?? 1;
    const search = query.search?.trim() || undefined;
    const isActive = onlyActive ? true : query.isActive;

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
      plans: plans.map((plan) => this.mapPlan(plan as PlanRow)),
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

    return this.mapPlan(plan as PlanRow);
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
        price: payload.price !== undefined ? new Prisma.Decimal(payload.price) : undefined,
        interval: payload.interval as SubscriptionIntervalEnum | undefined,
        intervalCount: payload.intervalCount,
        bonusMonths: payload.bonusMonths,
        isActive: payload.isActive,
        sortOrder: payload.sortOrder,
      },
      select: this.planSelect,
    });

    return this.mapPlan(plan as PlanRow);
  }

  async delete(id: number): Promise<{ message: string }> {
    await this.findById(id);
    await this.prisma.plan.delete({ where: { id } });

    return { message: 'Plano removido com sucesso.' };
  }
}
