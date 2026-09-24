import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PaymentMethodEnum } from '../../works/enums/payment-method.enum';
import { PaymentStatusEnum } from '../../works/enums/payment-status.enum';
import { MercadoPagoService } from '../../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  CreateSubscriptionResponseDto,
  ResponseFindAllSubscriptionsDto,
  ResponseSubscriptionDto,
} from './dto/response-subscription.dto';
import { ResponsePlanDto } from '../plans/dto/response-plan.dto';
import { PlansService } from '../plans/plans.service';
import {
  ResponseCatalogCategoryDto,
  ResponseSubscriptionCatalogDto,
} from './dto/response-subscription-catalog.dto';
import { SubscriptionIntervalEnum } from '../enums/subscription-interval.enum';
import { SubscriptionStatusEnum } from '../enums/subscription-status.enum';
import { PlanNotFoundException } from '../plans/exceptions/plan-not-found.exception';
import { SubscriptionAccessDeniedException } from './exceptions/subscription-access-denied.exception';
import { SubscriptionActiveNotFoundException } from './exceptions/subscription-active-not-found.exception';
import { SubscriptionAlreadyActiveException } from './exceptions/subscription-already-active.exception';
import { SubscriptionCategoryNotFoundException } from './exceptions/subscription-category-not-found.exception';
import { SubscriptionCancelOnlyActiveException } from './exceptions/subscription-cancel-only-active.exception';
import { SubscriptionNotFoundException } from './exceptions/subscription-not-found.exception';
import { SubscriptionNotCancelledException } from './exceptions/subscription-not-cancelled.exception';
import { SubscriptionRenewalNotDueException } from './exceptions/subscription-renewal-not-due.exception';
import { SubscriptionCancelledCannotRenewException } from './exceptions/subscription-cancelled-cannot-renew.exception';
import { estadoDoCiclo } from './subscription-period';
import { SubscriptionReceiverNotFoundException } from './exceptions/subscription-receiver-not-found.exception';
import { Prisma, User, Role } from '@prisma/client';
import { PaymentReferenceTypeEnum } from '../../works/enums/payment-reference-type.enum';
import { assinaturaVigenteWhere } from '../../subscription-guard/active-subscription.filter';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly notificationsService: NotificationsService,
    private readonly plansService: PlansService,
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
    cancelAtPeriodEnd: true,
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
    category: {
      select: { id: true, name: true, slug: true },
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

    const category = await this.prisma.serviceCategory.findFirst({
      where: { id: payload.categoryId, isActive: true },
      select: { id: true, name: true },
    });

    if (!category) {
      throw new SubscriptionCategoryNotFoundException();
    }

    // A trava deixou de ser "uma assinatura por usuário" e virou "uma por
    // categoria" — era exatamente esta consulta que impedia o fornecedor de
    // atuar em mais de uma frente.
    //
    // Usa o MESMO predicado do portão de propósito: se a pergunta aqui fosse
    // mais estreita que a de lá, o fornecedor pagaria por uma categoria que já
    // estava coberta; se fosse mais larga, pagaria e continuaria barrado.
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: assinaturaVigenteWhere(user.id, category.id),
      select: { id: true },
    });

    if (activeSubscription) {
      throw new SubscriptionAlreadyActiveException(category.name);
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
      title: `Assinatura ${plan.name} — ${category.name}`,
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
          categoryId: category.id,
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
          category: subscription.category ?? undefined,
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
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          ...estadoDoCiclo(subscription.currentPeriodEnd, subscription.cancelAtPeriodEnd),
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        };
      }),
    );

    return { subscriptions: result };
  }

  /**
   * A assinatura corrente, opcionalmente de uma categoria.
   *
   * Com a cobrança por categoria o fornecedor tem várias ao mesmo tempo, e
   * "a corrente" deixou de ser uma pergunta com resposta única. Por isso o
   * `categoryId`: sem ele a rota devolve a mais recente, como sempre devolveu,
   * e quem precisa de uma categoria específica passa a informá-la.
   *
   * Continua buscando por `status: Active` sem olhar a data de propósito — uma
   * assinatura vencida precisa voltar na resposta para a tela conseguir
   * oferecer a renovação. Quem responde se ela vale são os campos derivados
   * (`expired`, `inGracePeriod`), não a ausência do registro. Para saber se a
   * operação passa, o certo é o catálogo.
   */
  async findCurrent(user: User, categoryId?: number): Promise<ResponseSubscriptionDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: SubscriptionStatusEnum.Active,
        ...(categoryId !== undefined ? { categoryId } : {}),
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
      category: subscription.category ?? undefined,
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
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      ...estadoDoCiclo(subscription.currentPeriodEnd, subscription.cancelAtPeriodEnd),
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
      category: subscription.category ?? undefined,
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
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      ...estadoDoCiclo(subscription.currentPeriodEnd, subscription.cancelAtPeriodEnd),
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * Catálogo de contratação: categorias, planos e a situação em cada uma.
   *
   * Uma chamada monta a tela inteira. Antes disso o front teria que buscar
   * categorias, buscar planos, buscar as assinaturas do usuário e cruzar os
   * três — e o cruzamento é justamente onde a tela pode discordar da API.
   *
   * O predicado das assinaturas vigentes é o MESMO que o portão usa. É o que
   * garante que "assinado" na tela signifique "a operação vai passar": inclui a
   * tolerância de três dias e aceita a cobertura ampla das concessões.
   */
  async catalog(user: User): Promise<ResponseSubscriptionCatalogDto> {
    const [categories, planos, vigentes] = await Promise.all([
      this.prisma.serviceCategory.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, iconUrl: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      // `take` alto de propósito: o catálogo mostra todos os planos, e a
      // paginação padrão de dez esconderia um plano novo sem avisar ninguém.
      this.plansService.findAll({ take: 100 } as never, true),
      this.prisma.subscription.findMany({
        where: assinaturaVigenteWhere(user.id),
        select: {
          id: true,
          planName: true,
          categoryId: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
        orderBy: [{ currentPeriodEnd: 'desc' }],
      }),
    ]);

    // A concessão administrativa (`categoryId` nulo) cobre qualquer categoria.
    // É o segundo ramo do `OR` do portão, aplicado aqui sobre a mesma lista.
    const cobreTudo = vigentes.find((assinatura) => assinatura.categoryId === null);

    const linhas: ResponseCatalogCategoryDto[] = categories.map((categoria) => {
      const assinatura =
        vigentes.find((vigente) => vigente.categoryId === categoria.id) ?? cobreTudo;

      return {
        id: categoria.id,
        name: categoria.name,
        slug: categoria.slug,
        iconUrl: categoria.iconUrl || undefined,
        isSubscribed: Boolean(assinatura),
        subscription: assinatura
          ? {
              id: assinatura.id,
              planName: assinatura.planName,
              currentPeriodEnd: assinatura.currentPeriodEnd || undefined,
              cancelAtPeriodEnd: assinatura.cancelAtPeriodEnd,
              coversAllCategories: assinatura.categoryId === null,
              ...estadoDoCiclo(assinatura.currentPeriodEnd, assinatura.cancelAtPeriodEnd),
            }
          : undefined,
      };
    });

    return {
      plans: planos.plans,
      categories: linhas,
      subscribedCount: linhas.filter((linha) => linha.isSubscribed).length,
    };
  }

  /**
   * Cancela mantendo o acesso até o fim do período já pago.
   *
   * A peça de venda promete "sem fidelidade, cancele quando quiser". Antes
   * desta mudança, cancelar gravava `status: Cancelled` e o portão — que exige
   * `Active` — fechava na hora: quem pagou R$ 118,80 pelo ano e desistia no
   * segundo mês perdia dez meses pagos. A promessa virava punição.
   *
   * Agora `status` continua `Active` e a data faz o trabalho. Nada precisa
   * rodar depois: o portão já confere `currentPeriodEnd` a cada leitura.
   */
  async cancel(user: User, id: number): Promise<ResponseSubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
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

    const agora = new Date();

    // Sem período pago a agendar, cancelar é encerrar. É o caso da concessão
    // administrativa sem prazo: agendar nela deixaria o acesso valendo para
    // sempre, porque não existe data para o portão fechar.
    const encerraAgora =
      !subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() <= agora.getTime();

    await this.prisma.subscription.update({
      where: { id },
      data: encerraAgora
        ? { status: SubscriptionStatusEnum.Cancelled, cancelledAt: agora, cancelAtPeriodEnd: true }
        : { cancelAtPeriodEnd: true, cancelledAt: agora },
    });

    void this.notificationsService.notifyUser(
      subscription.userId,
      encerraAgora
        ? `Olá! Sua assinatura #${subscription.id} foi cancelada.`
        : `Olá! Sua assinatura #${subscription.id} foi cancelada e seguirá ativa até ` +
            `${subscription.currentPeriodEnd!.toLocaleDateString('pt-BR')}.`,
    );

    return this.findById(user, id);
  }

  /**
   * Desfaz um cancelamento agendado, sem cobrança.
   *
   * Só funciona enquanto o período pago não acabou — depois disso não há o que
   * reativar, e o caminho é renovar.
   */
  async reactivate(user: User, id: number): Promise<ResponseSubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });

    if (!subscription) {
      throw new SubscriptionNotFoundException();
    }

    if (subscription.userId !== user.id) {
      throw new SubscriptionAccessDeniedException();
    }

    if (subscription.status !== SubscriptionStatusEnum.Active || !subscription.cancelAtPeriodEnd) {
      throw new SubscriptionNotCancelledException();
    }

    await this.prisma.subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd: false, cancelledAt: null },
    });

    void this.notificationsService.notifyUser(
      subscription.userId,
      `Olá! Sua assinatura #${subscription.id} voltou a renovar normalmente.`,
    );

    return this.findById(user, id);
  }

  /**
   * Gera um novo checkout para esticar a assinatura por mais um ciclo.
   *
   * A renovação é manual por decisão de produto: não há cobrança recorrente no
   * Mercado Pago, e montar uma exigiria outra integração e habilitação
   * comercial. O fornecedor clica, paga, e o webhook emenda o período.
   *
   * O valor e o ciclo saem do PLANO, não da assinatura: reprecificar o plano
   * passa a valer na próxima renovação, que é o comportamento esperado de quem
   * mexe na tabela de preços.
   */
  async renew(user: User, id: number): Promise<CreateSubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        category: { select: { id: true, name: true } },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            interval: true,
            intervalCount: true,
            bonusMonths: true,
            isActive: true,
          },
        },
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

    if (subscription.cancelAtPeriodEnd) {
      throw new SubscriptionCancelledCannotRenewException();
    }

    if (!subscription.plan.isActive) {
      // Plano tirado de circulação — o trimestral, por exemplo. Renovar nele
      // recriaria um produto que a plataforma parou de vender.
      throw new PlanNotFoundException();
    }

    const ciclo = estadoDoCiclo(subscription.currentPeriodEnd, false);

    if (!ciclo.needsRenewal) {
      throw new SubscriptionRenewalNotDueException(ciclo.daysUntilExpiration ?? 0);
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
    const titulo = subscription.category
      ? `Renovação ${subscription.plan.name} — ${subscription.category.name}`
      : `Renovação ${subscription.plan.name}`;

    const { preferenceId, checkoutUrl } = await this.mercadoPagoService.createPreference({
      title: titulo,
      unitPrice: Number(subscription.plan.price),
      externalReference,
      payerEmail: payloadEmailDe(user),
    });

    await this.prisma.payment.create({
      data: {
        status: PaymentStatusEnum.Pending,
        referenceType: PaymentReferenceTypeEnum.Subscription,
        referenceId: subscription.id,
        amount: subscription.plan.price,
        payerId: user.id,
        receiverId: receiver.id,
        externalReference,
        mpPreferenceId: preferenceId,
      },
    });

    return {
      message: 'Renovação criada com sucesso. Finalize o pagamento para estender a assinatura.',
      checkoutUrl,
      subscription: await this.findById(user, subscription.id),
    };
  }
}

/** Email do pagador para pré-preencher o checkout, quando houver. */
function payloadEmailDe(user: User): string | undefined {
  return user.email ?? undefined;
}
