import { PrismaService } from '@database/PrismaService';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Coupon, CouponTypeEnum, Prisma } from '@prisma/client';

import { CreateCouponDto, ResponseCouponDto, UpdateCouponDto } from './dto/create-coupon.dto';
import { CouponNotFoundException } from './exceptions/coupon-not-found.exception';

@Injectable()
export class AdminCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(adminId: number, payload: CreateCouponDto): Promise<ResponseCouponDto> {
    this.assertCoherent(payload.type, payload.value, payload.startsAt, payload.endsAt);

    const code = payload.code.trim().toUpperCase();
    const existente = await this.prisma.coupon.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existente) {
      throw new BadRequestException(`Já existe um cupom com o código ${code}.`);
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code,
        createdById: adminId,
        description: payload.description,
        type: payload.type,
        value: payload.value,
        maxDiscountValue: payload.maxDiscountValue,
        minOrderValue: payload.minOrderValue,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
        endsAt: payload.endsAt ? new Date(payload.endsAt) : undefined,
        maxUses: payload.maxUses,
        maxUsesPerCustomer: payload.maxUsesPerCustomer,
        restaurantId: payload.restaurantId,
        isActive: payload.isActive,
      },
    });

    return this.toResponse(coupon, 0);
  }

  async update(id: number, payload: UpdateCouponDto): Promise<ResponseCouponDto> {
    const atual = await this.prisma.coupon.findUnique({ where: { id } });

    if (!atual) throw new CouponNotFoundException();

    // Valida o cupom como ele FICARÁ, não só o que veio no corpo: mandar só o
    // tipo, sem valor, deixaria um `Percent` sem percentual.
    this.assertCoherent(
      payload.type ?? atual.type,
      payload.value ?? (atual.value ? Number(atual.value) : undefined),
      payload.startsAt ?? atual.startsAt?.toISOString(),
      payload.endsAt ?? atual.endsAt?.toISOString(),
    );

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...this.toData(payload),
        ...(payload.code ? { code: payload.code.trim().toUpperCase() } : {}),
      },
    });

    return this.toResponse(coupon, await this.countUses(id));
  }

  async findAll(): Promise<ResponseCouponDto[]> {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    });

    return coupons.map((coupon) => this.toResponse(coupon, coupon._count.redemptions));
  }

  async findById(id: number): Promise<ResponseCouponDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });

    if (!coupon) throw new CouponNotFoundException();

    return this.toResponse(coupon, coupon._count.redemptions);
  }

  /**
   * Desativa em vez de apagar.
   *
   * Cupom já resgatado tem `CouponRedemption` e `FoodOrder` apontando para ele:
   * apagar quebraria o histórico de pedidos que usaram o desconto.
   */
  async deactivate(id: number): Promise<ResponseCouponDto> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id }, select: { id: true } });

    if (!coupon) throw new CouponNotFoundException();

    const atualizado = await this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });

    return this.toResponse(atualizado, await this.countUses(id));
  }

  private countUses(couponId: number): Promise<number> {
    return this.prisma.couponRedemption.count({ where: { couponId } });
  }

  /**
   * Coerência entre tipo e valor, e entre início e fim.
   *
   * `class-validator` valida campo a campo; estas são relações entre campos.
   */
  private assertCoherent(
    type: CouponTypeEnum,
    value?: number,
    startsAt?: string | null,
    endsAt?: string | null,
  ): void {
    if (type !== CouponTypeEnum.FreeShipping && (value === undefined || value === null)) {
      throw new BadRequestException('Cupom de percentual ou valor fixo precisa de um valor.');
    }

    if (type === CouponTypeEnum.Percent && value !== undefined && value > 100) {
      throw new BadRequestException('Um cupom percentual não pode passar de 100%.');
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      throw new BadRequestException('O fim da vigência precisa ser depois do início.');
    }
  }

  /** Só para o update: o create monta o próprio objeto, com `type` obrigatório. */
  private toData(payload: UpdateCouponDto): Prisma.CouponUncheckedUpdateInput {
    return {
      description: payload.description,
      type: payload.type,
      value: payload.value,
      maxDiscountValue: payload.maxDiscountValue,
      minOrderValue: payload.minOrderValue,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : undefined,
      maxUses: payload.maxUses,
      maxUsesPerCustomer: payload.maxUsesPerCustomer,
      restaurantId: payload.restaurantId,
      isActive: payload.isActive,
    };
  }

  private toResponse(coupon: Coupon, timesUsed: number): ResponseCouponDto {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description ?? undefined,
      type: coupon.type,
      value: coupon.value?.toFixed(2),
      maxDiscountValue: coupon.maxDiscountValue?.toFixed(2),
      minOrderValue: coupon.minOrderValue?.toFixed(2),
      startsAt: coupon.startsAt ?? undefined,
      endsAt: coupon.endsAt ?? undefined,
      maxUses: coupon.maxUses ?? undefined,
      maxUsesPerCustomer: coupon.maxUsesPerCustomer ?? undefined,
      restaurantId: coupon.restaurantId ?? undefined,
      isActive: coupon.isActive,
      timesUsed,
      createdAt: coupon.createdAt,
    };
  }
}
