import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { FoodOrderStatusEnum, Payment, Prisma } from '@prisma/client';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { PaymentStatusEnum } from '../works/enums/payment-status.enum';
import { PaymentReferenceTypeEnum } from '../works/enums/payment-reference-type.enum';
import { FinancialTransactionTypeEnum } from '../works/enums/financial-transaction-type.enum';
import { FinancialTransactionCategoryEnum } from '../works/enums/financial-transaction-category.enum';
import { CommercialTransactionStatusEnum } from '../commercial-transactions/enums/commercial-transaction-status.enum';
import { SubscriptionStatusEnum } from '../plans/enums/subscription-status.enum';
import { SubscriptionIntervalEnum } from '../plans/enums/subscription-interval.enum';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Estados do Mercado Pago em que o dinheiro voltou ao cliente depois de ter
 * sido aprovado. `refunded` é devolução; `charged_back` é contestação no
 * cartão. Os dois caíam no vazio antes desta fase.
 */
const REVERSAL_STATUSES = ['refunded', 'charged_back'];

/**
 * Sinaliza que outra notificação do mesmo pagamento chegou primeiro.
 *
 * Existe para desfazer a transação sem virar erro para fora: webhook
 * duplicado é rotina do Mercado Pago, não falha.
 */
class PaymentAlreadyConfirmedError extends Error {}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly notificationsService: NotificationsService,
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

    // Atalho, não garantia: o pagamento pode virar `Paid` entre esta leitura e
    // a transação. Quem de fato impede o processamento em dobro é o `claim`
    // dentro de cada confirmação, que trava a linha no banco.
    if (
      localPayment.status === PaymentStatusEnum.Paid &&
      !REVERSAL_STATUSES.includes(mpPayment.status)
    ) {
      return;
    }

    if (mpPayment.status === 'approved') {
      await this.confirmPayment(localPayment, mpPayment);
      return;
    }

    if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      await this.cancelPayment(localPayment);
      return;
    }

    if (REVERSAL_STATUSES.includes(mpPayment.status)) {
      await this.refundPayment(localPayment, mpPayment);
      return;
    }

    // `in_process` e `in_mediation` são estados de trânsito: o pagamento ainda
    // pode virar aprovado ou recusado, e mexer no pedido agora seria adiantar
    // um desfecho que não existe. O que faltava era o registro — antes a
    // notificação sumia sem deixar rastro de que havia chegado.
    this.logger.log(
      `Pagamento ${mpPayment.id} em estado não terminal (${mpPayment.status}); ` +
        'nenhuma ação tomada, aguardando notificação seguinte.',
    );
  }

  private async confirmPayment(
    localPayment: Payment,
    mpPayment: Record<string, any>,
  ): Promise<void> {
    const method = this.mercadoPagoService.mapPaymentMethod(
      mpPayment.payment_type_id,
      mpPayment.payment_method_id,
    );

    try {
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
        case PaymentReferenceTypeEnum.FoodOrder:
          await this.confirmFoodOrderPayment(localPayment, mpPayment, method);
          break;
        default:
          this.logger.warn(`referenceType não suportado no webhook: ${localPayment.referenceType}`);
      }
    } catch (error) {
      // Outra notificação do mesmo pagamento chegou primeiro e ganhou a
      // corrida. Não é erro: responder 500 faria o Mercado Pago reenviar a
      // notificação indefinidamente por algo que já está feito.
      if (error instanceof PaymentAlreadyConfirmedError) {
        this.logger.debug(
          `Pagamento ${localPayment.id} já havia sido confirmado por outra notificação.`,
        );
        return;
      }

      throw error;
    }
  }

  /**
   * Marca o pagamento como pago, e só deixa passar quem chegar primeiro.
   *
   * O `updateMany` com a condição no WHERE é o que torna a confirmação
   * idempotente de verdade: o banco trava a linha, a segunda transação espera,
   * e ao seguir encontra o status já em `Paid` — alcançando zero linhas. Antes
   * a checagem era uma leitura fora da transação, então duas notificações
   * simultâneas passavam as duas, e o que salvava era o índice único de
   * `mpPaymentId` estourando no fim: o razão ficava íntegro, mas o Mercado Pago
   * recebia 500 e reenviava.
   */
  private async claimPayment(
    tx: Prisma.TransactionClient,
    localPayment: Payment,
    mpPayment: Record<string, any>,
    method: ReturnType<MercadoPagoService['mapPaymentMethod']>,
    paidAt: Date,
  ): Promise<void> {
    const { count } = await tx.payment.updateMany({
      where: { id: localPayment.id, status: { not: PaymentStatusEnum.Paid } },
      data: { status: PaymentStatusEnum.Paid, method, mpPaymentId: String(mpPayment.id), paidAt },
    });

    if (count === 0) throw new PaymentAlreadyConfirmedError();
  }

  /**
   * Pagamento aprovado que depois voltou ao cliente.
   *
   * Registra e alerta; **não mexe em dinheiro de ninguém**. Reverter os
   * lançamentos decidiria, por conta própria, se o entregador que fez a
   * entrega e o restaurante que produziu o pedido ficam sem receber — e essa
   * regra não existe. O que dá para fazer sem inventar é não deixar o estorno
   * passar despercebido: o pedido deixa de constar como pago, o alerta sobe
   * alto, e os repasses afetados aparecem sinalizados para o admin antes de
   * ele pagar.
   */
  private async refundPayment(
    localPayment: Payment,
    mpPayment: Record<string, any>,
  ): Promise<void> {
    const { count } = await this.prisma.payment.updateMany({
      where: { id: localPayment.id, status: { not: PaymentStatusEnum.Refunded } },
      data: { status: PaymentStatusEnum.Refunded },
    });

    if (count === 0) {
      this.logger.debug(`Estorno do pagamento ${localPayment.id} já havia sido registrado.`);
      return;
    }

    if (localPayment.referenceType === PaymentReferenceTypeEnum.FoodOrder) {
      await this.prisma.foodOrder.update({
        where: { id: localPayment.referenceId },
        data: { paymentStatus: PaymentStatusEnum.Refunded },
      });
    }

    this.logger.error(
      `Pagamento ${localPayment.id} (${localPayment.referenceType} ` +
        `#${localPayment.referenceId}) foi ${mpPayment.status} no Mercado Pago, ` +
        `no valor de R$ ${localPayment.amount.toFixed(2)}. ` +
        'Os lançamentos NÃO foram revertidos automaticamente; verificar repasses.',
    );

    void this.notificationsService.notifyUser(
      localPayment.receiverId,
      `Atenção: o pagamento de R$ ${localPayment.amount.toFixed(2)} que você recebeu foi ` +
        'devolvido ao cliente. Entre em contato com o suporte.',
    );
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

      // Pedido de comida é o único que NÃO é cancelado junto com o pagamento.
      // Um Pix que venceu não deve derrubar um pedido que o restaurante pode
      // já estar preparando. O pagamento fica `Cancelled`, o pedido continua
      // `Pending`, e é isso que libera o cliente a gerar um novo checkout.
    });

    void this.notificationsService.notifyUser(
      localPayment.payerId,
      'Olá! Seu pagamento não foi aprovado ou foi cancelado. Você pode tentar novamente pelo app.',
    );
  }

  /**
   * Lançamento da taxa retida pela plataforma no split, do lado do recebedor.
   *
   * O crédito continua sendo o valor cheio, de propósito: o extrato precisa
   * mostrar quanto a venda gerou. A taxa entra como débito na mesma data, e a
   * diferença entre os dois é o que o vendedor de fato recebeu — que é como o
   * saldo é calculado (`soma de créditos menos soma de débitos`).
   *
   * Sem isso o saldo exibia o bruto enquanto o Mercado Pago já havia descontado
   * a comissão na origem. Valia para trabalho, negociação e pedido de delivery,
   * os três fluxos com split.
   */
  private feeTransaction(localPayment: Payment, paidAt: Date, descricao: string) {
    if (!localPayment.platformFeeAmount || localPayment.platformFeeAmount.lte(0)) {
      return [];
    }

    return [
      {
        type: FinancialTransactionTypeEnum.Debit,
        category: FinancialTransactionCategoryEnum.Fee,
        status: PaymentStatusEnum.Paid,
        amount: localPayment.platformFeeAmount,
        description: descricao,
        availableAt: paidAt,
        referenceType: localPayment.referenceType,
        referenceId: localPayment.referenceId,
        userId: localPayment.receiverId,
        paymentId: localPayment.id,
      },
    ];
  }

  private async confirmCommercialTransactionPayment(
    localPayment: Payment,
    mpPayment: Record<string, any>,
    method: ReturnType<MercadoPagoService['mapPaymentMethod']>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();

      await this.claimPayment(tx, localPayment, mpPayment, method, paidAt);

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
          ...this.feeTransaction(
            localPayment,
            paidAt,
            `Taxa da plataforma sobre a negociação #${localPayment.referenceId}`,
          ),
        ],
      });
    });

    void this.notificationsService.notifyUser(
      localPayment.payerId,
      'Olá! Seu pagamento foi confirmado com sucesso.',
    );
    void this.notificationsService.notifyUser(
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

      await this.claimPayment(tx, localPayment, mpPayment, method, paidAt);

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
          ...this.feeTransaction(
            localPayment,
            paidAt,
            `Taxa da plataforma sobre o trabalho #${localPayment.referenceId}`,
          ),
        ],
      });
    });

    void this.notificationsService.notifyUser(
      localPayment.payerId,
      'Olá! Seu pagamento foi confirmado com sucesso.',
    );
    void this.notificationsService.notifyUser(
      localPayment.receiverId,
      'Olá! Você recebeu um pagamento pelo trabalho.',
    );
  }

  /**
   * Confirma o pagamento de um pedido de delivery.
   *
   * O `paymentStatus` do pedido é a fonte de verdade que o app lê; o `Payment`
   * é a trilha do gateway. Os dois precisam virar na mesma transação, senão um
   * webhook reentregue encontraria estados divergentes.
   *
   * O `status` do pedido não é tocado: quem move o pedido pela cozinha e pela
   * entrega é o restaurante, não o meio de pagamento.
   */
  private async confirmFoodOrderPayment(
    localPayment: Payment,
    mpPayment: Record<string, any>,
    method: ReturnType<MercadoPagoService['mapPaymentMethod']>,
  ): Promise<void> {
    const foodOrder = await this.prisma.foodOrder.findUnique({
      where: { id: localPayment.referenceId },
      select: { id: true, status: true, itemsValue: true, deliveryFee: true },
    });

    if (!foodOrder) {
      this.logger.warn(
        `Pedido ${localPayment.referenceId} não encontrado para confirmação de pagamento.`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();

      await this.claimPayment(tx, localPayment, mpPayment, method, paidAt);

      await tx.foodOrder.update({
        where: { id: foodOrder.id },
        data: { paymentStatus: PaymentStatusEnum.Paid, paidAt },
      });

      await tx.financialTransaction.createMany({
        data: [
          {
            type: FinancialTransactionTypeEnum.Debit,
            category: FinancialTransactionCategoryEnum.FoodOrderPayment,
            status: PaymentStatusEnum.Paid,
            amount: localPayment.amount,
            description: `Pagamento do pedido #${foodOrder.id} (itens e frete)`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.FoodOrder,
            referenceId: foodOrder.id,
            userId: localPayment.payerId,
            paymentId: localPayment.id,
          },
          {
            type: FinancialTransactionTypeEnum.Credit,
            category: FinancialTransactionCategoryEnum.FoodOrderPayment,
            status: PaymentStatusEnum.Paid,
            // Só o valor dos itens. O frete é receita do entregador, creditado
            // a ele em `deliveries.service` na entrega — creditar o total aqui
            // colocava o mesmo frete no razão duas vezes e inflava o saldo do
            // restaurante exatamente nesse valor.
            amount: foodOrder.itemsValue,
            description: `Recebimento dos itens do pedido #${foodOrder.id}`,
            availableAt: paidAt,
            referenceType: PaymentReferenceTypeEnum.FoodOrder,
            referenceId: foodOrder.id,
            userId: localPayment.receiverId,
            paymentId: localPayment.id,
          },
          ...this.feeTransaction(
            localPayment,
            paidAt,
            `Taxa da plataforma sobre o pedido #${foodOrder.id}`,
          ),
        ],
      });
    });

    // Um pedido cancelado que recebe pagamento aprovado é caso de estorno, não
    // de operação normal: registra alto para alguém olhar.
    if (foodOrder.status === FoodOrderStatusEnum.Cancelled) {
      this.logger.error(
        `Pagamento aprovado para o pedido ${foodOrder.id}, que está cancelado. Verificar estorno.`,
      );
    }

    void this.notificationsService.notifyUser(
      localPayment.payerId,
      `Olá! O pagamento do pedido #${foodOrder.id} foi confirmado.`,
    );
    void this.notificationsService.notifyUser(
      localPayment.receiverId,
      `Olá! O pagamento do pedido #${foodOrder.id} foi confirmado.`,
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

      await this.claimPayment(tx, localPayment, mpPayment, method, paidAt);

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

    void this.notificationsService.notifyUser(
      localPayment.payerId,
      'Olá! Seu pagamento foi confirmado com sucesso.',
    );
    void this.notificationsService.notifyUser(
      localPayment.receiverId,
      'Olá! Você recebeu um pagamento pela assinatura.',
    );
  }
}
