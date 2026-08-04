import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { PaymentStatusEnum } from '../works/enums/payment-status.enum';
import { PaymentReferenceTypeEnum } from '../works/enums/payment-reference-type.enum';
import { FinancialTransactionTypeEnum } from '../works/enums/financial-transaction-type.enum';
import { FinancialTransactionCategoryEnum } from '../works/enums/financial-transaction-category.enum';
import { CommercialTransactionStatusEnum } from '../commercial-transactions/enums/commercial-transaction-status.enum';
import { SubscriptionStatusEnum } from '../plans/enums/subscription-status.enum';
import { SubscriptionIntervalEnum } from '../plans/enums/subscription-interval.enum';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async handleMercadoPagoNotification(
    body: Record<string, any>,
    query: Record<string, any>,
    xSignature?: string,
    xRequestId?: string,
  ): Promise<void> {
    const type = body?.type || body?.action?.split('.')?.[0] || query?.type || query?.topic;
    const dataId = body?.data?.id || query?.['data.id'] || query?.id;

    if (type !== 'payment' || !dataId) {
      return;
    }

    if (!this.mercadoPagoService.verifySignature(xSignature, xRequestId, String(dataId))) {
      this.logger.warn(`Assinatura inválida no webhook do Mercado Pago (dataId=${dataId}).`);
      return;
    }

    let mpPayment: Awaited<ReturnType<MercadoPagoService['getPayment']>>;
    try {
      mpPayment = await this.mercadoPagoService.getPayment(String(dataId));
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        this.logger.error(
          'Mercado Pago não configurado; não foi possível confirmar o pagamento recebido no webhook.',
        );
        return;
      }
      throw error;
    }

    if (!mpPayment?.external_reference) {
      this.logger.warn(`Pagamento do Mercado Pago sem external_reference (id=${dataId}).`);
      return;
    }

    const localPayment = await this.prisma.payment.findUnique({
      where: { externalReference: mpPayment.external_reference },
    });

    if (!localPayment) {
      this.logger.warn(
        `Nenhum pagamento local encontrado para externalReference=${mpPayment.external_reference}.`,
      );
      return;
    }

    if (localPayment.status === PaymentStatusEnum.Paid) {
      return;
    }

    if (mpPayment.status === 'approved') {
      await this.confirmPayment(localPayment, mpPayment);
    } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      await this.cancelPayment(localPayment);
    }
  }

  private async confirmPayment(
    localPayment: Payment,
    mpPayment: Record<string, any>,
  ): Promise<void> {
    const method = this.mercadoPagoService.mapPaymentMethod(
      mpPayment.payment_type_id,
      mpPayment.payment_method_id,
    );

    switch (localPayment.referenceType) {
      case PaymentReferenceTypeEnum.CommercialTransaction:
        await this.confirmCommercialTransactionPayment(localPayment, mpPayment, method);
        break;
      case PaymentReferenceTypeEnum.Work:
        await this.confirmWorkPayment(localPayment, mpPayment, method);
        break;
      case PaymentReferenceTypeEnum.Subscription:
        await this.confirmSubscriptionPayment(localPayment, mpPayment, method);
        break;
      default:
        this.logger.warn(`referenceType não suportado no webhook: ${localPayment.referenceType}`);
    }
  }

  private async cancelPayment(localPayment: Payment): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: localPayment.id },
        data: { status: PaymentStatusEnum.Cancelled },
      });

      if (localPayment.referenceType === PaymentReferenceTypeEnum.CommercialTransaction) {
        await tx.commercialTransaction.update({
          where: { id: localPayment.referenceId },
          data: { status: CommercialTransactionStatusEnum.Cancelled, cancelledAt: new Date() },
        });
      }

      if (localPayment.referenceType === PaymentReferenceTypeEnum.Subscription) {
        await tx.subscription.update({
          where: { id: localPayment.referenceId },
          data: { status: SubscriptionStatusEnum.Cancelled, cancelledAt: new Date() },
        });
      }
    });

    void this.whatsappService.notifyUser(
      localPayment.payerId,
      'Olá! Seu pagamento não foi aprovado ou foi cancelado. Você pode tentar novamente pelo app.',
    );
  }

  private async confirmCommercialTransactionPayment(
    localPayment: Payment,
    mpPayment: Record<string, any>,
    method: ReturnType<MercadoPagoService['mapPaymentMethod']>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();

      await tx.payment.update({
        where: { id: localPayment.id },
        data: { status: PaymentStatusEnum.Paid, method, mpPaymentId: String(mpPayment.id), paidAt },
      });

      await tx.commercialTransaction.update({
        where: { id: localPayment.referenceId },
        data: { status: CommercialTransactionStatusEnum.Paid, paidAt },
      });

      await tx.financialTransaction.createMany({
        data: [
          {
            type: FinancialTransactionTypeEnum.Debit,
            category: FinancialTransactionCategoryEnum.CommercialTransaction,
            status: PaymentStatusEnum.Paid,
            amount: localPayment.amount,
            description: `Pagamento da negociação #${localPayment.referenceId}`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.CommercialTransaction,
            referenceId: localPayment.referenceId,
            userId: localPayment.payerId,
            paymentId: localPayment.id,
          },
          {
            type: FinancialTransactionTypeEnum.Credit,
            category: FinancialTransactionCategoryEnum.CommercialTransaction,
            status: PaymentStatusEnum.Paid,
            amount: localPayment.amount,
            description: `Recebimento da negociação #${localPayment.referenceId}`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.CommercialTransaction,
            referenceId: localPayment.referenceId,
            userId: localPayment.receiverId,
            paymentId: localPayment.id,
          },
        ],
      });
    });

    void this.whatsappService.notifyUser(
      localPayment.payerId,
      'Olá! Seu pagamento foi confirmado com sucesso.',
    );
    void this.whatsappService.notifyUser(
      localPayment.receiverId,
      'Olá! Você recebeu um pagamento pela negociação.',
    );
  }

  private async confirmWorkPayment(
    localPayment: Payment,
    mpPayment: Record<string, any>,
    method: ReturnType<MercadoPagoService['mapPaymentMethod']>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();

      await tx.payment.update({
        where: { id: localPayment.id },
        data: { status: PaymentStatusEnum.Paid, method, mpPaymentId: String(mpPayment.id), paidAt },
      });

      await tx.financialTransaction.createMany({
        data: [
          {
            type: FinancialTransactionTypeEnum.Debit,
            category: FinancialTransactionCategoryEnum.WorkPayment,
            status: PaymentStatusEnum.Paid,
            amount: localPayment.amount,
            description: `Pagamento do trabalho #${localPayment.referenceId}`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.Work,
            referenceId: localPayment.referenceId,
            userId: localPayment.payerId,
            paymentId: localPayment.id,
          },
          {
            type: FinancialTransactionTypeEnum.Credit,
            category: FinancialTransactionCategoryEnum.WorkPayment,
            status: PaymentStatusEnum.Paid,
            amount: localPayment.amount,
            description: `Recebimento do trabalho #${localPayment.referenceId}`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.Work,
            referenceId: localPayment.referenceId,
            userId: localPayment.receiverId,
            paymentId: localPayment.id,
          },
        ],
      });
    });

    void this.whatsappService.notifyUser(
      localPayment.payerId,
      'Olá! Seu pagamento foi confirmado com sucesso.',
    );
    void this.whatsappService.notifyUser(
      localPayment.receiverId,
      'Olá! Você recebeu um pagamento pelo trabalho.',
    );
  }

  private async confirmSubscriptionPayment(
    localPayment: Payment,
    mpPayment: Record<string, any>,
    method: ReturnType<MercadoPagoService['mapPaymentMethod']>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();

      const subscription = await tx.subscription.findUnique({
        where: { id: localPayment.referenceId },
        select: {
          id: true,
          planInterval: true,
          intervalCount: true,
          bonusMonths: true,
          userId: true,
        },
      });

      if (!subscription) {
        this.logger.warn(
          `Assinatura ${localPayment.referenceId} não encontrada para confirmação de pagamento.`,
        );
        return;
      }

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      if (subscription.planInterval === SubscriptionIntervalEnum.Year) {
        periodEnd.setFullYear(periodEnd.getFullYear() + subscription.intervalCount);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + subscription.intervalCount);
      }
      if (subscription.bonusMonths > 0) {
        periodEnd.setMonth(periodEnd.getMonth() + subscription.bonusMonths);
      }

      await tx.payment.update({
        where: { id: localPayment.id },
        data: { status: PaymentStatusEnum.Paid, method, mpPaymentId: String(mpPayment.id), paidAt },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatusEnum.Active,
          startedAt: periodStart,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      await tx.financialTransaction.createMany({
        data: [
          {
            type: FinancialTransactionTypeEnum.Debit,
            category: FinancialTransactionCategoryEnum.Subscription,
            status: PaymentStatusEnum.Paid,
            amount: localPayment.amount,
            description: `Pagamento da assinatura #${subscription.id}`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.Subscription,
            referenceId: subscription.id,
            userId: localPayment.payerId,
            paymentId: localPayment.id,
          },
          {
            type: FinancialTransactionTypeEnum.Credit,
            category: FinancialTransactionCategoryEnum.Subscription,
            status: PaymentStatusEnum.Paid,
            amount: localPayment.amount,
            description: `Recebimento da assinatura #${subscription.id}`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.Subscription,
            referenceId: subscription.id,
            userId: localPayment.receiverId,
            paymentId: localPayment.id,
          },
        ],
      });

      const referral = await tx.referral.findUnique({
        where: { referredUserId: subscription.userId },
        select: { id: true, influencerId: true, isPaying: true },
      });

      if (referral && !referral.isPaying) {
        const [influencer, platformSettings] = await Promise.all([
          tx.user.findUnique({
            where: { id: referral.influencerId },
            select: { commissionRate: true },
          }),
          tx.platformSettings.findUnique({
            where: { id: 1 },
            select: { influencerCommissionRate: true },
          }),
        ]);

        const globalRate = platformSettings
          ? Number(platformSettings.influencerCommissionRate)
          : 10;
        const rate =
          influencer && influencer.commissionRate ? Number(influencer.commissionRate) : globalRate;
        const commissionAmount = new Prisma.Decimal(
          (localPayment.amount.toNumber() * (rate / 100)).toFixed(2),
        );

        await tx.referral.update({
          where: { id: referral.id },
          data: { isPaying: true, commissionAmount, paidAt },
        });

        await tx.financialTransaction.create({
          data: {
            type: FinancialTransactionTypeEnum.Credit,
            category: FinancialTransactionCategoryEnum.ReferralCommission,
            status: PaymentStatusEnum.Paid,
            amount: commissionAmount,
            description: `Comissão por indicação convertida (assinatura #${subscription.id})`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.Referral,
            referenceId: referral.id,
            userId: referral.influencerId,
            paymentId: localPayment.id,
          },
        });
      }
    });

    void this.whatsappService.notifyUser(
      localPayment.payerId,
      'Olá! Seu pagamento foi confirmado com sucesso.',
    );
    void this.whatsappService.notifyUser(
      localPayment.receiverId,
      'Olá! Você recebeu um pagamento pela assinatura.',
    );
  }
}
