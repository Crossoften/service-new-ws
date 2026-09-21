import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { calculateCommission, resolveCommissionRate } from '../food-orders/commission';
import { Coupon, CouponTypeEnum, Prisma, User } from '@prisma/client';

import { calculateCouponDiscount, platformDiscountAllowance } from './coupon-discount';
import { CouponNotApplicableException } from './exceptions/coupon-not-applicable.exception';

export interface CouponResolution {
  coupon: Coupon;
  discount: Prisma.Decimal;
}

/** Mesmo padrão do módulo de pedidos, para as duas contas baterem. */

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve o cupom para um pedido concreto, ou explica por que ele não vale.
   *
   * É o MESMO caminho usado pela rota de pré-visualização e pela criação do
   * pedido. Duplicar a regra faria a tela prometer um desconto que o pedido
   * depois recusaria.
   */
  async resolveForOrder(params: {
    code: string;
    user: User;
    restaurantId: number;
    itemsValue: Prisma.Decimal;
    deliveryFee: Prisma.Decimal;
    commissionAmount: Prisma.Decimal | null;
  }): Promise<CouponResolution> {
    const coupon = await this.findEligible(
      params.code,
      params.user.id,
      params.restaurantId,
      params.itemsValue,
    );

    const discount = calculateCouponDiscount(coupon, params.itemsValue, params.deliveryFee);

    if (discount.lessThanOrEqualTo(0)) {
      throw new CouponNotApplicableException('Este cupom não gera desconto neste pedido.');
    }

    // O desconto sai da comissão da plataforma. Acima dela, não há de onde
    // tirar sem furar o repasse do entregador — ver `platformDiscountAllowance`.
    const teto = platformDiscountAllowance(params.commissionAmount);

    if (discount.greaterThan(teto)) {
      throw new CouponNotApplicableException(
        'Este cupom não pode ser aplicado a este pedido. Tente um pedido de valor maior.',
      );
    }

    return { coupon, discount };
  }

  /**
   * Pré-visualização para a tela da sacola.
   *
   * Roda as mesmas checagens da criação do pedido, exceto as que dependem de
   * números que ainda não existem: o frete depende do endereço escolhido e a
   * comissão depende do `billingType` do dono. A comissão é estimada sobre os
   * itens informados, o que já basta para recusar cedo um cupom grande demais.
   *
   * Cupom de frete grátis volta com desconto zero de propósito: o front não
   * conhece o frete antes de criar o pedido, então a tela mostra "frete grátis"
   * em vez de um valor. O desconto real sai na criação.
   */
  async resolveForPreview(params: {
    code: string;
    user: User;
    restaurantId: number;
    itemsValue: Prisma.Decimal;
  }): Promise<CouponResolution> {
    const coupon = await this.findEligible(
      params.code,
      params.user.id,
      params.restaurantId,
      params.itemsValue,
    );

    if (coupon.type === CouponTypeEnum.FreeShipping) {
      return { coupon, discount: new Prisma.Decimal(0) };
    }

    const discount = calculateCouponDiscount(coupon, params.itemsValue, new Prisma.Decimal(0));

    if (discount.lessThanOrEqualTo(0)) {
      throw new CouponNotApplicableException('Este cupom não gera desconto neste pedido.');
    }

    const teto = platformDiscountAllowance(
      await this.estimateCommission(params.restaurantId, params.itemsValue),
    );

    if (discount.greaterThan(teto)) {
      throw new CouponNotApplicableException(
        'Este cupom não pode ser aplicado a este pedido. Tente um pedido de valor maior.',
      );
    }

    return { coupon, discount };
  }

  /**
   * Comissão que o restaurante geraria sobre estes itens.
   *
   * Mesma regra da criação do pedido: só quem fatura por comissão gera base
   * para desconto. Duplicá-la aqui é deliberado — a alternativa seria a
   * pré-visualização depender do módulo de pedidos inteiro.
   */
  private async estimateCommission(
    restaurantId: number,
    itemsValue: Prisma.Decimal,
  ): Promise<Prisma.Decimal | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { user: { select: { billingType: true, deliveryCommissionRate: true } } },
    });

    const rate = resolveCommissionRate(restaurant?.user);

    if (rate === null) return null;

    return calculateCommission(itemsValue, rate);
  }

  /**
   * Checagens que não dependem de dinheiro: existência, vigência, escopo,
   * mínimo e limites de uso.
   */
  private async findEligible(
    code: string,
    userId: number,
    restaurantId: number,
    itemsValue: Prisma.Decimal,
  ): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new CouponNotApplicableException('Cupom inválido ou inativo.');
    }

    const agora = new Date();

    if (coupon.startsAt && coupon.startsAt > agora) {
      throw new CouponNotApplicableException('Este cupom ainda não está valendo.');
    }

    if (coupon.endsAt && coupon.endsAt < agora) {
      throw new CouponNotApplicableException('Este cupom expirou.');
    }

    if (coupon.restaurantId && coupon.restaurantId !== restaurantId) {
      throw new CouponNotApplicableException('Este cupom não vale para este restaurante.');
    }

    if (coupon.minOrderValue && itemsValue.lessThan(coupon.minOrderValue)) {
      throw new CouponNotApplicableException(
        `Este cupom exige pedido de ao menos R$ ${coupon.minOrderValue.toFixed(2)} em itens.`,
      );
    }

    await this.assertUsageLeft(coupon, userId);

    return coupon;
  }

  /**
   * Limites de uso, total e por cliente.
   *
   * Conta resgates, não pedidos: pedido cancelado cujo resgate foi removido não
   * deve consumir o cupom de ninguém.
   */
  private async assertUsageLeft(coupon: Coupon, userId: number): Promise<void> {
    if (coupon.maxUses) {
      const usos = await this.prisma.couponRedemption.count({ where: { couponId: coupon.id } });

      if (usos >= coupon.maxUses) {
        throw new CouponNotApplicableException('Este cupom atingiu o limite de usos.');
      }
    }

    if (coupon.maxUsesPerCustomer) {
      const meus = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId },
      });

      if (meus >= coupon.maxUsesPerCustomer) {
        throw new CouponNotApplicableException('Você já usou este cupom o número máximo de vezes.');
      }
    }
  }
}
