import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PaymentMethodEnum } from '../../works/enums/payment-method.enum';
import { PaymentStatusEnum } from '../../works/enums/payment-status.enum';
import { MercadoPagoService } from '../../mercado-pago/mercado-pago.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
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
import { PaymentReferenceTypeEnum } from '../../works/enums/payment-reference-type.enum';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly whatsappService: WhatsappService,
  ) {}

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
        bonusMonths: true,
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
        bonusMonths: true,
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

    const externalReference = randomUUID();

    const { preferenceId, checkoutUrl } = await this.mercadoPagoService.createPreference({
      title: `Assinatura ${plan.name}`,
      unitPrice: Number(plan.price),
      externalReference,
      payerEmail: payload.payerEmail,
    });

    const subscription = await this.prisma.$transaction(async (tx) => {
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

      const createdSubscription = await tx.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: SubscriptionStatusEnum.Pending,
          amount: plan.price,
          planName: plan.name,
          planInterval: plan.interval,
          intervalCount: plan.intervalCount,
          bonusMonths: plan.bonusMonths,
          addressId: address?.id || null,
        },
        select: { id: true },
      });

      await tx.payment.create({
        data: {
          status: PaymentStatusEnum.Pending,
          referenceType: PaymentReferenceTypeEnum.Subscription,
          referenceId: createdSubscription.id,
          amount: plan.price,
          payerId: user.id,
          receiverId: receiver.id,
          externalReference,
          mpPreferenceId: preferenceId,
        },
      });

      return createdSubscription;
    });

    return {
      message: 'Assinatura criada com sucesso. Finalize o pagamento para ativá-la.',
      checkoutUrl,
      subscription: await this.findById(user, subscription.id),
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
            bonusMonths: subscription.plan.bonusMonths,
            monthlyPrice: (
              subscription.plan.price.toNumber() /
              ((subscription.plan.interval === SubscriptionIntervalEnum.Year
                ? subscription.plan.intervalCount * 12
                : subscription.plan.intervalCount) + subscription.plan.bonusMonths || 1)
            ).toFixed(2),
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
        bonusMonths: subscription.plan.bonusMonths,
        monthlyPrice: (
          subscription.plan.price.toNumber() /
          ((subscription.plan.interval === SubscriptionIntervalEnum.Year
            ? subscription.plan.intervalCount * 12
            : subscription.plan.intervalCount) + subscription.plan.bonusMonths || 1)
        ).toFixed(2),
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
        bonusMonths: subscription.plan.bonusMonths,
        monthlyPrice: (
          subscription.plan.price.toNumber() /
          ((subscription.plan.interval === SubscriptionIntervalEnum.Year
            ? subscription.plan.intervalCount * 12
            : subscription.plan.intervalCount) + subscription.plan.bonusMonths || 1)
        ).toFixed(2),
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

    void this.whatsappService.notifyUser(
      subscription.userId,
      `Olá! Sua assinatura #${subscription.id} foi cancelada.`,
    );

    return this.findById(user, id);
  }
}
