import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger } from '@nestjs/common';
import {
  FinancialTransactionCategoryEnum,
  FinancialTransactionTypeEnum,
  PaymentReferenceTypeEnum,
  PaymentStatusEnum,
  Prisma,
} from '@prisma/client';

import { NotificationsService } from '../../notifications/notifications.service';
import { CreateDeliveryPayoutDto } from './dto/create-delivery-payout.dto';
import {
  ResponseDeliveryPayoutDto,
  ResponsePendingPayoutDto,
} from './dto/response-delivery-payout.dto';
import { DeliveryPayoutAmountChangedException } from './exceptions/delivery-payout-amount-changed.exception';
import { DeliveryPayoutConcurrentException } from './exceptions/delivery-payout-concurrent.exception';
import { DeliveryPayoutNothingToSettleException } from './exceptions/delivery-payout-nothing-to-settle.exception';

interface PendingGroup {
  userId: number;
  amount: Prisma.Decimal;
  deliveries: number;
  oldestAt: Date;
  refundedDeliveries: number;
  refundedAmount: Prisma.Decimal;
}

/**
 * Repasse do que a plataforma deve aos entregadores.
 *
 * O frete e a gorjeta são retidos pela plataforma no split do Mercado Pago e
 * viram crédito do entregador no razão quando ele finaliza a entrega. Até aqui
 * a história parava nisso: o crédito existia, aparecia na tela de ganhos e
 * nunca virava dinheiro, porque nenhuma rotina do projeto o liquidava.
 *
 * Nesta etapa o pagamento em si acontece fora do sistema — o admin faz o Pix e
 * registra aqui. O que o backend garante é o resto: quanto se deve a quem, que
 * um crédito só seja quitado uma vez, e que cada saída tenha comprovante.
 */
@Injectable()
export class AdminDeliveryPayoutsService {
  private readonly logger = new Logger(AdminDeliveryPayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Créditos que ainda não foram repassados.
   *
   * `payoutId: null` é a definição de "em aberto" — não há coluna de status
   * para desencontrar do razão.
   *
   * A carência é respeitada por `availableAt`: hoje ele nasce igual ao momento
   * da entrega, então tudo está disponível na hora, mas se amanhã o dinheiro
   * passar a liberar em D+7 este filtro já cobre, sem tocar aqui. O `null` é
   * aceito porque a coluna é opcional e lançamento sem data nunca deve sumir do
   * saldo.
   */
  private pendingWhere(courierId?: number): Prisma.FinancialTransactionWhereInput {
    return {
      ...(courierId ? { userId: courierId } : {}),
      type: FinancialTransactionTypeEnum.Credit,
      category: FinancialTransactionCategoryEnum.DeliveryPayout,
      status: PaymentStatusEnum.Paid,
      payoutId: null,
      OR: [{ availableAt: null }, { availableAt: { lte: new Date() } }],
    };
  }

  /** Quanto a plataforma deve, por entregador, do maior para o menor. */
  async findPending(): Promise<ResponsePendingPayoutDto[]> {
    // Um a um, e não `groupBy`, porque cada crédito precisa ser cruzado com o
    // pedido que o originou: é assim que os estornos aparecem sinalizados.
    // O volume é naturalmente pequeno — crédito em aberto some assim que o
    // repasse é pago.
    const pendentes = await this.prisma.financialTransaction.findMany({
      where: this.pendingWhere(),
      select: { userId: true, amount: true, createdAt: true, referenceId: true },
    });

    if (!pendentes.length) return [];

    const estornados = await this.pedidosEstornados(pendentes.map((p) => p.referenceId));

    const grupos = [...this.agrupar(pendentes, estornados).values()];

    const entregadores = await this.prisma.user.findMany({
      where: { id: { in: grupos.map((g) => g.userId) } },
      select: {
        id: true,
        name: true,
        phone: true,
        // Os dados bancários vêm junto porque é com eles que o admin faz o
        // pagamento. Sem isso a tela de repasse obrigaria a abrir o cadastro do
        // entregador em outra aba para cada linha.
        bankAccount: {
          select: {
            bankName: true,
            accountType: true,
            agency: true,
            account: true,
            cpf: true,
            pixKey: true,
            pixKeyType: true,
          },
        },
      },
    });

    const porId = new Map(entregadores.map((e) => [e.id, e]));

    return grupos
      .map((grupo) => {
        const entregador = porId.get(grupo.userId);

        return {
          courierId: grupo.userId,
          courierName: entregador?.name ?? 'Entregador removido',
          courierPhone: entregador?.phone ?? undefined,
          amount: grupo.amount.toFixed(2),
          deliveries: grupo.deliveries,
          oldestAt: grupo.oldestAt,
          refundedDeliveries: grupo.refundedDeliveries,
          refundedAmount: grupo.refundedAmount.toFixed(2),
          bankAccount: entregador?.bankAccount
            ? {
                ...entregador.bankAccount,
                pixKey: entregador.bankAccount.pixKey ?? undefined,
                pixKeyType: entregador.bankAccount.pixKeyType ?? undefined,
              }
            : undefined,
        };
      })
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  }

  /**
   * Pedidos cujo pagamento voltou ao cliente depois de aprovado.
   *
   * O webhook marca o estorno mas **não reverte lançamento nenhum** — reverter
   * decidiria, sozinho, se o entregador que fez a entrega fica sem receber. O
   * saldo dele continua contando esses créditos; o que muda é que eles chegam
   * sinalizados ao admin, que decide com a informação na mão.
   */
  private async pedidosEstornados(ids: number[]): Promise<Set<number>> {
    const pedidos = await this.prisma.foodOrder.findMany({
      where: { id: { in: [...new Set(ids)] }, paymentStatus: PaymentStatusEnum.Refunded },
      select: { id: true },
    });

    return new Set(pedidos.map((pedido) => pedido.id));
  }

  private agrupar(
    pendentes: { userId: number; amount: Prisma.Decimal; createdAt: Date; referenceId: number }[],
    estornados: Set<number>,
  ): Map<number, PendingGroup> {
    const porEntregador = new Map<number, PendingGroup>();

    for (const credito of pendentes) {
      const grupo = porEntregador.get(credito.userId) ?? {
        userId: credito.userId,
        amount: new Prisma.Decimal(0),
        deliveries: 0,
        oldestAt: credito.createdAt,
        refundedDeliveries: 0,
        refundedAmount: new Prisma.Decimal(0),
      };

      grupo.amount = grupo.amount.plus(credito.amount);
      grupo.deliveries += 1;
      if (credito.createdAt < grupo.oldestAt) grupo.oldestAt = credito.createdAt;

      if (estornados.has(credito.referenceId)) {
        grupo.refundedDeliveries += 1;
        grupo.refundedAmount = grupo.refundedAmount.plus(credito.amount);
      }

      porEntregador.set(credito.userId, grupo);
    }

    return porEntregador;
  }

  /**
   * Registra um repasse já pago e dá baixa em tudo que estava em aberto.
   *
   * Liquida o saldo inteiro do entregador, não um valor escolhido: repasse
   * parcial precisaria decidir quais entregas entram, e não há regra definida
   * para isso — fica como pendência funcional em vez de uma escolha inventada
   * aqui.
   */
  async create(
    adminId: number,
    payload: CreateDeliveryPayoutDto,
  ): Promise<ResponseDeliveryPayoutDto> {
    const payout = await this.prisma.$transaction(async (tx) => {
      const pendentes = await tx.financialTransaction.findMany({
        where: this.pendingWhere(payload.courierId),
        select: { id: true, amount: true },
      });

      if (!pendentes.length) throw new DeliveryPayoutNothingToSettleException();

      const total = pendentes.reduce(
        (soma, lancamento) => soma.plus(lancamento.amount),
        new Prisma.Decimal(0),
      );

      if (payload.expectedAmount !== undefined) {
        const esperado = new Prisma.Decimal(payload.expectedAmount.toFixed(2));

        if (!total.equals(esperado)) {
          throw new DeliveryPayoutAmountChangedException(total.toFixed(2));
        }
      }

      const criado = await tx.deliveryPayout.create({
        data: {
          amount: total,
          method: payload.method,
          reference: payload.reference?.trim() || null,
          notes: payload.notes?.trim() || null,
          transactionsCount: pendentes.length,
          paidAt: new Date(),
          courierId: payload.courierId,
          createdById: adminId,
        },
      });

      // `payoutId: null` no WHERE é a trava contra corrida: se outro admin
      // liquidou algum destes créditos no intervalo, o UPDATE alcança menos
      // linhas e a transação inteira é desfeita.
      const { count } = await tx.financialTransaction.updateMany({
        where: { id: { in: pendentes.map((p) => p.id) }, payoutId: null },
        data: { payoutId: criado.id },
      });

      if (count !== pendentes.length) throw new DeliveryPayoutConcurrentException();

      // A contrapartida no razão. Sem ela o saldo do entregador fecharia
      // errado: os créditos continuariam somando e nada registraria a saída.
      await tx.financialTransaction.create({
        data: {
          type: FinancialTransactionTypeEnum.Debit,
          category: FinancialTransactionCategoryEnum.Withdrawal,
          status: PaymentStatusEnum.Paid,
          amount: total,
          description: `Repasse de ${pendentes.length} entrega(s) pago por ${payload.method}.`,
          availableAt: criado.paidAt,
          referenceType: PaymentReferenceTypeEnum.DeliveryPayout,
          referenceId: criado.id,
          userId: payload.courierId,
          payoutId: criado.id,
        },
      });

      return criado;
    });

    this.logger.log(
      `Repasse #${payout.id} de R$ ${payout.amount.toFixed(2)} ao entregador ` +
        `${payout.courierId}, registrado pelo admin ${adminId}.`,
    );

    // Fora da transação e sem `await`: aviso é acessório e não pode desfazer um
    // repasse que já foi pago de verdade. O `NotificationsService` já engole as
    // falhas de cada canal por dentro.
    void this.notificationsService.notifyUser(
      payout.courierId,
      `Olá! O repasse de R$ ${payout.amount.toFixed(2)} pelas suas entregas foi enviado.`,
      'Repasse enviado',
    );

    return this.toResponse(payout, null);
  }

  /** Histórico de repasses, do mais recente para o mais antigo. */
  async findAll(courierId?: number): Promise<ResponseDeliveryPayoutDto[]> {
    const payouts = await this.prisma.deliveryPayout.findMany({
      where: courierId ? { courierId } : undefined,
      orderBy: { paidAt: 'desc' },
      include: { courier: { select: { name: true } } },
    });

    return payouts.map((payout) => this.toResponse(payout, payout.courier.name));
  }

  private toResponse(
    payout: {
      id: number;
      courierId: number;
      amount: Prisma.Decimal;
      method: ResponseDeliveryPayoutDto['method'];
      reference: string | null;
      notes: string | null;
      transactionsCount: number;
      paidAt: Date;
      createdById: number;
      createdAt: Date;
    },
    courierName: string | null,
  ): ResponseDeliveryPayoutDto {
    return {
      id: payout.id,
      courierId: payout.courierId,
      courierName: courierName ?? '',
      amount: payout.amount.toFixed(2),
      method: payout.method,
      reference: payout.reference ?? undefined,
      notes: payout.notes ?? undefined,
      transactionsCount: payout.transactionsCount,
      paidAt: payout.paidAt,
      createdById: payout.createdById,
      createdAt: payout.createdAt,
    };
  }
}
