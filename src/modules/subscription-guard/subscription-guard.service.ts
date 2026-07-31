import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { BillingTypeEnum, User } from '@prisma/client';
import { SubscriptionStatusEnum } from '../plans/enums/subscription-status.enum';
import { SupplierSubscriptionRequiredException } from './exceptions/supplier-subscription-required.exception';

@Injectable()
export class SubscriptionGuardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * BE-15/BE-16: assinatura é pré-condição para o fornecedor operar em todas as
   * verticais. No delivery (híbrido), o fornecedor pode optar por comissão por
   * pedido (billingType Commission) em vez de assinatura — nesse caso o gate é
   * ignorado quando allowCommissionBilling é true.
   */
  async assertActiveSubscription(
    user: User,
    options?: { allowCommissionBilling?: boolean },
  ): Promise<void> {
    if (options?.allowCommissionBilling && user.billingType === BillingTypeEnum.Commission) {
      return;
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: SubscriptionStatusEnum.Active,
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: new Date() } }],
      },
      select: { id: true },
    });

    if (!activeSubscription) {
      throw new SupplierSubscriptionRequiredException();
    }
  }
}
