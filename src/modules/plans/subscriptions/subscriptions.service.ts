import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';

import { FinancialTransactionTypeEnum } from '../../works/enums/financial-transaction-type.enum';
import { PaymentMethodEnum } from '../../works/enums/payment-method.enum';
import { PaymentStatusEnum } from '../../works/enums/payment-status.enum';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  CreateSubscriptionResponseDto,
  ResponseFindAllSubscriptionsDto,
  ResponseSubscriptionDto,
} from './dto/response-subscription.dto';
import { ResponsePlanDto } from '../plans/dto/response-plan.dto';
import { SubscriptionIntervalEnum } from '../enums/subscription-interval.enum';
import { SubscriptionStatusEnum } from '../enums/subscription-status.enum';
import { PlanNotFoundException } from '../plans/exceptions/plan-not-found.exception';
import { SubscriptionAccessDeniedException } from './exceptions/subscription-access-denied.exception';
import { SubscriptionActiveNotFoundException } from './exceptions/subscription-active-not-found.exception';
import { SubscriptionAlreadyActiveException } from './exceptions/subscription-already-active.exception';
import { SubscriptionCancelOnlyActiveException } from './exceptions/subscription-cancel-only-active.exception';
import { SubscriptionNotFoundException } from './exceptions/subscription-not-found.exception';
import { SubscriptionReceiverNotFoundException } from './exceptions/subscription-receiver-not-found.exception';
import { Prisma, User, Role } from '@prisma/client';
import { FinancialTransactionCategoryEnum } from '../../works/enums/financial-transaction-category.enum';
import { PaymentReferenceTypeEnum } from '../../works/enums/payment-reference-type.enum';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly subscriptionSelect = Prisma.validator<Prisma.SubscriptionSelect>()({
    id: true,
    status: true,
    amount: true,
    planName: true,
    planInterval: true,
    intervalCount: true,
    startedAt: true,
    currentPeriodStart: true,
    currentPeriodEnd: true,
    cancelledAt: true,
    createdAt: true,
    updatedAt: true,
    address: {
      select: {
        id: true,
        street: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
      },
    },
    plan: {
      select: {
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
      },
    },
  });

  async create(user: User, payload: CreateSubscriptionDto): Promise<CreateSubscriptionResponseDto> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: payload.planId },
      select: {
        id: true,
        name: true,
        price: true,
        interval: true,
        intervalCount: true,
        isActive: true,
      },
    });

    if (!plan || !plan.isActive) {
      throw new PlanNotFoundException();
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: SubscriptionStatusEnum.Active,
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: new Date() } }],
      },
      select: { id: true },
    });

    if (activeSubscription) {
      throw new SubscriptionAlreadyActiveException();
    }

    const receiver = await this.prisma.user.findFirst({
      where: {
        id: { not: user.id },
        OR: [{ role: Role.Master }, { role: Role.Admin }],
      },
      select: { id: true },
      orderBy: [{ id: 'asc' }],
    });

    if (!receiver) {
      throw new SubscriptionReceiverNotFoundException();
    }

    const periodStart = new Date();
    const interval = plan.interval as SubscriptionIntervalEnum;
    const periodEnd = new Date(periodStart);
    if (interval === SubscriptionIntervalEnum.Year) {
      periodEnd.setFullYear(periodEnd.getFullYear() + plan.intervalCount);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + plan.intervalCount);
    }

    const trimmedCardNumber = payload.cardNumber ? payload.cardNumber.replace(/\s+/g, '') : '';
    const cardLast4 =
      trimmedCardNumber.length >= 4
        ? trimmedCardNumber.slice(trimmedCardNumber.length - 4)
        : undefined;

    const created = await this.prisma.$transaction(async (tx) => {
      const address =
        payload.billingStreet?.trim() ||
        payload.billingNeighborhood?.trim() ||
        payload.billingCity?.trim() ||
        payload.billingState?.trim() ||
        payload.billingZipCode?.trim()
          ? await tx.address.create({
              data: {
                street: payload.billingStreet?.trim() || null,
                neighborhood: payload.billingNeighborhood?.trim() || null,
                city: payload.billingCity?.trim() || null,
                state: payload.billingState?.trim() || null,
                zipCode: payload.billingZipCode?.trim() || null,
              },
              select: { id: true },
            })
          : null;

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: SubscriptionStatusEnum.Active,
          amount: plan.price,
          planName: plan.name,
          planInterval: plan.interval,
          intervalCount: plan.intervalCount,
          addressId: address?.id || null,
          startedAt: periodStart,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        select: { id: true },
      });

      const payment = await tx.payment.create({
        data: {
          method: payload.method as PaymentMethodEnum,
          status: PaymentStatusEnum.Paid,
          referenceType: PaymentReferenceTypeEnum.Subscription,
          referenceId: subscription.id,
          holderName: payload.holderName?.trim() || null,
          cardBrand: payload.cardBrand?.trim() || null,
          cardLast4: cardLast4 || null,
          amount: plan.price,
          paidAt: new Date(),
          payerId: user.id,
          receiverId: receiver.id,
        },
      });

      await tx.financialTransaction.createMany({
        data: [
          {
            type: FinancialTransactionTypeEnum.Debit,
            category: FinancialTransactionCategoryEnum.Subscription,
            status: PaymentStatusEnum.Paid,
            amount: plan.price,
            description: `Pagamento da assinatura #${subscription.id}`,
            availableAt: new Date(),
            referenceType: PaymentReferenceTypeEnum.Subscription,
            referenceId: subscription.id,
            userId: user.id,
            paymentId: payment.id,
          },
          {
            type: FinancialTransactionTypeEnum.Credit,
            category: FinancialTransactionCategoryEnum.Subscription,
            status: PaymentStatusEnum.Paid,
            amount: plan.price,
            description: `Recebimento da assinatura #${subscription.id}`,
            availableAt: new Date(),
            referenceType: PaymentReferenceTypeEnum.Subscription,
            referenceId: subscription.id,
            userId: receiver.id,
            paymentId: payment.id,
          },
        ],
      });

      return subscription.id;
    });

    return {
      message: 'Assinatura criada com sucesso.',
      subscription: await this.findById(user, created),
    };
  }

  async findMine(user: User): Promise<ResponseFindAllSubscriptionsDto> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId: user.id },
      select: this.subscriptionSelect,
      orderBy: [{ createdAt: 'desc' }],
    });

    const result = await Promise.all(
      subscriptions.map(async (subscription) => {
        const payment = await this.prisma.payment.findFirst({
          where: {
            referenceType: PaymentReferenceTypeEnum.Subscription,
            referenceId: subscription.id,
          },
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            holderName: true,
            cardBrand: true,
            cardLast4: true,
            paidAt: true,
          },
          orderBy: [{ createdAt: 'desc' }],
        });

        return {
          id: subscription.id,
          status: subscription.status as SubscriptionStatusEnum,
          amount: subscription.amount.toFixed(2),
          planName: subscription.planName,
          planInterval: subscription.planInterval as SubscriptionIntervalEnum,
          intervalCount: subscription.intervalCount,
          plan: {
            id: subscription.plan.id,
            name: subscription.plan.name,
            slug: subscription.plan.slug,
            description: subscription.plan.description || undefined,
            price: subscription.plan.price.toFixed(2),
            interval: subscription.plan.interval as SubscriptionIntervalEnum,
            intervalCount: subscription.plan.intervalCount,
            benefits: Array.isArray(subscription.plan.benefits)
              ? subscription.plan.benefits.map((item: any) => String(item))
              : [],
            isActive: subscription.plan.isActive,
            sortOrder: subscription.plan.sortOrder,
            createdAt: subscription.plan.createdAt,
            updatedAt: subscription.plan.updatedAt,
          } as ResponsePlanDto,
          payment: payment
            ? {
                id: payment.id,
                method: payment.method as PaymentMethodEnum,
                status: payment.status as PaymentStatusEnum,
                amount: payment.amount.toFixed(2),
                holderName: payment.holderName || undefined,
                cardBrand: payment.cardBrand || undefined,
                cardLast4: payment.cardLast4 || undefined,
                paidAt: payment.paidAt || undefined,
              }
            : undefined,
          address: subscription.address
            ? {
                id: subscription.address.id,
                street: subscription.address.street || undefined,
                neighborhood: subscription.address.neighborhood || undefined,
                city: subscription.address.city || undefined,
                state: subscription.address.state || undefined,
                zipCode: subscription.address.zipCode || undefined,
              }
            : undefined,
          startedAt: subscription.startedAt || undefined,
          currentPeriodStart: subscription.currentPeriodStart || undefined,
          currentPeriodEnd: subscription.currentPeriodEnd || undefined,
          cancelledAt: subscription.cancelledAt || undefined,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        };
      }),
    );

    return { subscriptions: result };
  }

  async findCurrent(user: User): Promise<ResponseSubscriptionDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: SubscriptionStatusEnum.Active,
      },
      select: this.subscriptionSelect,
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!subscription) {
      throw new SubscriptionActiveNotFoundException();
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        referenceType: PaymentReferenceTypeEnum.Subscription,
        referenceId: subscription.id,
      },
      select: {
        id: true,
        method: true,
        status: true,
        amount: true,
        holderName: true,
        cardBrand: true,
        cardLast4: true,
        paidAt: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionStatusEnum,
      amount: subscription.amount.toFixed(2),
      planName: subscription.planName,
      planInterval: subscription.planInterval as SubscriptionIntervalEnum,
      intervalCount: subscription.intervalCount,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        description: subscription.plan.description || undefined,
        price: subscription.plan.price.toFixed(2),
        interval: subscription.plan.interval as SubscriptionIntervalEnum,
        intervalCount: subscription.plan.intervalCount,
        benefits: Array.isArray(subscription.plan.benefits)
          ? subscription.plan.benefits.map((item: any) => String(item))
          : [],
        isActive: subscription.plan.isActive,
        sortOrder: subscription.plan.sortOrder,
        createdAt: subscription.plan.createdAt,
        updatedAt: subscription.plan.updatedAt,
      } as ResponsePlanDto,
      payment: payment
        ? {
            id: payment.id,
            method: payment.method as PaymentMethodEnum,
            status: payment.status as PaymentStatusEnum,
            amount: payment.amount.toFixed(2),
            holderName: payment.holderName || undefined,
            cardBrand: payment.cardBrand || undefined,
            cardLast4: payment.cardLast4 || undefined,
            paidAt: payment.paidAt || undefined,
          }
        : undefined,
      address: subscription.address
        ? {
            id: subscription.address.id,
            street: subscription.address.street || undefined,
            neighborhood: subscription.address.neighborhood || undefined,
            city: subscription.address.city || undefined,
            state: subscription.address.state || undefined,
            zipCode: subscription.address.zipCode || undefined,
          }
        : undefined,
      startedAt: subscription.startedAt || undefined,
      currentPeriodStart: subscription.currentPeriodStart || undefined,
      currentPeriodEnd: subscription.currentPeriodEnd || undefined,
      cancelledAt: subscription.cancelledAt || undefined,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  async findById(user: User, id: number): Promise<ResponseSubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      select: {
        ...this.subscriptionSelect,
        userId: true,
      },
    });

    if (!subscription) {
      throw new SubscriptionNotFoundException();
    }

    const canAccess =
      subscription.userId === user.id || user.role === Role.Admin || user.role === Role.Master;

    if (!canAccess) {
      throw new SubscriptionAccessDeniedException();
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        referenceType: PaymentReferenceTypeEnum.Subscription,
        referenceId: subscription.id,
      },
      select: {
        id: true,
        method: true,
        status: true,
        amount: true,
        holderName: true,
        cardBrand: true,
        cardLast4: true,
        paidAt: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionStatusEnum,
      amount: subscription.amount.toFixed(2),
      planName: subscription.planName,
      planInterval: subscription.planInterval as SubscriptionIntervalEnum,
      intervalCount: subscription.intervalCount,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        description: subscription.plan.description || undefined,
        price: subscription.plan.price.toFixed(2),
        interval: subscription.plan.interval as SubscriptionIntervalEnum,
        intervalCount: subscription.plan.intervalCount,
        benefits: Array.isArray(subscription.plan.benefits)
          ? subscription.plan.benefits.map((item: any) => String(item))
          : [],
        isActive: subscription.plan.isActive,
        sortOrder: subscription.plan.sortOrder,
        createdAt: subscription.plan.createdAt,
        updatedAt: subscription.plan.updatedAt,
      } as ResponsePlanDto,
      payment: payment
        ? {
            id: payment.id,
            method: payment.method as PaymentMethodEnum,
            status: payment.status as PaymentStatusEnum,
            amount: payment.amount.toFixed(2),
            holderName: payment.holderName || undefined,
            cardBrand: payment.cardBrand || undefined,
            cardLast4: payment.cardLast4 || undefined,
            paidAt: payment.paidAt || undefined,
          }
        : undefined,
      address: subscription.address
        ? {
            id: subscription.address.id,
            street: subscription.address.street || undefined,
            neighborhood: subscription.address.neighborhood || undefined,
            city: subscription.address.city || undefined,
            state: subscription.address.state || undefined,
            zipCode: subscription.address.zipCode || undefined,
          }
        : undefined,
      startedAt: subscription.startedAt || undefined,
      currentPeriodStart: subscription.currentPeriodStart || undefined,
      currentPeriodEnd: subscription.currentPeriodEnd || undefined,
      cancelledAt: subscription.cancelledAt || undefined,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  async cancel(user: User, id: number): Promise<ResponseSubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!subscription) {
      throw new SubscriptionNotFoundException();
    }

    if (subscription.userId !== user.id) {
      throw new SubscriptionAccessDeniedException();
    }

    if (subscription.status !== SubscriptionStatusEnum.Active) {
      throw new SubscriptionCancelOnlyActiveException();
    }

    await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatusEnum.Cancelled,
        cancelledAt: new Date(),
      },
    });

    return this.findById(user, id);
  }
}
