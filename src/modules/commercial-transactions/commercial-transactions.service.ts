import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import {
  ChatContextType,
  CommercialTransactionReferenceType as PrismaCommercialTransactionReferenceType,
  CommercialTransactionStatus as PrismaCommercialTransactionStatus,
  FinancialTransactionCategory as PrismaFinancialTransactionCategory,
  PaymentMethod as PrismaPaymentMethod,
  PaymentReferenceType as PrismaPaymentReferenceType,
  PaymentStatus as PrismaPaymentStatus,
  Prisma,
  Role,
  User,
} from '@prisma/client';
import { parsePositiveInt } from 'src/utils/parsePositiveInt';
import { parsePriceDecimal } from 'src/utils/parsePriceDecimal';
import { ProductNotFoundException } from '../products/exceptions/product-not-found.exception';
import { FinancialTransactionType } from '../works/enums/financial-transaction-type.enum';
import { PaymentMethod } from '../works/enums/payment-method.enum';
import { PaymentStatus } from '../works/enums/payment-status.enum';
import { CreateCommercialTransactionDto } from './dto/create-commercial-transaction.dto';
import { PayCommercialTransactionDto } from './dto/pay-commercial-transaction.dto';
import {
  CreateCommercialTransactionResponseDto,
  ResponseCommercialTransactionDto,
  ResponseFindAllCommercialTransactionDto,
} from './dto/response-commercial-transaction.dto';
import { QueryCommercialTransactionDto } from './dto/query-commercial-transaction.dto';
import { RespondCommercialTransactionDto } from './dto/respond-commercial-transaction.dto';
import { CommercialTransactionParticipantRole } from './enums/commercial-transaction-participant-role.enum';
import { CommercialTransactionReferenceType } from './enums/commercial-transaction-reference-type.enum';
import { CommercialTransactionStatus } from './enums/commercial-transaction-status.enum';
import { CommercialTransactionAccessDeniedException } from './exceptions/commercial-transaction-access-denied.exception';
import { CommercialTransactionAlreadyFinishedException } from './exceptions/commercial-transaction-already-finished.exception';
import { CommercialTransactionBuyerCompletionNotAllowedException } from './exceptions/commercial-transaction-buyer-completion-not-allowed.exception';
import { CommercialTransactionBuyerPaymentNotAllowedException } from './exceptions/commercial-transaction-buyer-payment-not-allowed.exception';
import { CommercialTransactionChatNotFoundException } from './exceptions/commercial-transaction-chat-not-found.exception';
import { CommercialTransactionInvalidResponseStatusException } from './exceptions/commercial-transaction-invalid-response-status.exception';
import { CommercialTransactionNotFoundException } from './exceptions/commercial-transaction-not-found.exception';
import { CommercialTransactionPaidCancelNotAllowedException } from './exceptions/commercial-transaction-paid-cancel-not-allowed.exception';
import { CommercialTransactionPaymentAlreadyRegisteredException } from './exceptions/commercial-transaction-payment-already-registered.exception';
import { CommercialTransactionPaymentBeforeAcceptanceException } from './exceptions/commercial-transaction-payment-before-acceptance.exception';
import { CommercialTransactionPendingResponseOnlyException } from './exceptions/commercial-transaction-pending-response-only.exception';
import { CommercialTransactionSelfRequestNotAllowedException } from './exceptions/commercial-transaction-self-request-not-allowed.exception';
import { CommercialTransactionSellerResponseNotAllowedException } from './exceptions/commercial-transaction-seller-response-not-allowed.exception';
import { CommercialTransactionUnpaidCompletionNotAllowedException } from './exceptions/commercial-transaction-unpaid-completion-not-allowed.exception';
import { CommercialTransactionUnsupportedReferenceTypeException } from './exceptions/commercial-transaction-unsupported-reference-type.exception';

@Injectable()
export class CommercialTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly transactionSelect = Prisma.validator<Prisma.CommercialTransactionSelect>()({
    id: true,
    referenceType: true,
    referenceId: true,
    status: true,
    title: true,
    description: true,
    requestedAmount: true,
    agreedAmount: true,
    buyerId: true,
    sellerId: true,
    acceptedAt: true,
    rejectedAt: true,
    cancelledAt: true,
    paidAt: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
    buyer: {
      select: {
        id: true,
        name: true,
        fileUrl: true,
      },
    },
    seller: {
      select: {
        id: true,
        name: true,
        fileUrl: true,
      },
    },
    product: {
      select: {
        id: true,
        name: true,
        model: true,
        price: true,
        imageUrl: true,
      },
    },
  });

  async create(
    user: User,
    payload: CreateCommercialTransactionDto,
  ): Promise<CreateCommercialTransactionResponseDto> {
    if (payload.referenceType !== CommercialTransactionReferenceType.Product) {
      throw new CommercialTransactionUnsupportedReferenceTypeException();
    }

    const referenceId = parsePositiveInt(payload.referenceId, 'referenceId');
    const requestedAmount = parsePriceDecimal(payload.requestedAmount);
    const product = await this.prisma.product.findUnique({
      where: { id: referenceId },
      select: {
        id: true,
        name: true,
        price: true,
        userId: true,
        isActive: true,
      },
    });

    if (!product || !product.isActive) {
      throw new ProductNotFoundException();
    }

    if (product.userId === user.id) {
      throw new CommercialTransactionSelfRequestNotAllowedException();
    }

    const title = payload.title?.trim() || `Solicitação para ${product.name}`;
    const description = payload.description?.trim() || null;
    const defaultMessage = `Solicitação enviada no valor de R$ ${requestedAmount.toFixed(2)}.`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.commercialTransaction.create({
        data: {
          referenceType: PrismaCommercialTransactionReferenceType.Product,
          referenceId,
          status: PrismaCommercialTransactionStatus.Requested,
          title,
          description,
          requestedAmount,
          buyerId: user.id,
          sellerId: product.userId,
        },
        select: { id: true },
      });

      const room = await tx.chatRoom.create({
        data: {
          contextType: ChatContextType.CommercialTransaction,
          referenceId: createdTransaction.id,
          createdById: user.id,
          lastMessageAt: new Date(),
          participants: {
            create: [{ userId: user.id }, { userId: product.userId }],
          },
          messages: {
            create: {
              senderId: user.id,
              message: description || defaultMessage,
              fileName: payload.fileName?.trim() || null,
              fileUrl: payload.fileUrl?.trim() || null,
              fileKey: payload.fileKey?.trim() || null,
            },
          },
        },
        select: { id: true },
      });

      await tx.chatParticipant.update({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: user.id,
          },
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      return createdTransaction;
    });

    return {
      message: 'Solicitação de compra enviada com sucesso.',
      transaction: await this.findById(user, transaction.id),
    };
  }

  async findAll(
    user: User,
    query: QueryCommercialTransactionDto,
  ): Promise<ResponseFindAllCommercialTransactionDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const search = query.search?.trim() || undefined;
    const participantRole = query.participantRole || CommercialTransactionParticipantRole.All;

    const accessFilter = this.buildAccessFilter(user, participantRole);
    const where: Prisma.CommercialTransactionWhereInput = {
      status: query.status as PrismaCommercialTransactionStatus | undefined,
      AND: [
        accessFilter,
        search
          ? {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } },
                { product: { name: { contains: search } } },
                { buyer: { name: { contains: search } } },
                { seller: { name: { contains: search } } },
              ],
            }
          : {},
      ],
    };

    const [transactions, totalRecords] = await Promise.all([
      this.prisma.commercialTransaction.findMany({
        where,
        select: this.transactionSelect,
        orderBy: [{ updatedAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.commercialTransaction.count({ where }),
    ]);

    return {
      transactions: await this.mapTransactions(transactions),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findById(user: User, id: number): Promise<ResponseCommercialTransactionDto> {
    const transaction = await this.prisma.commercialTransaction.findUnique({
      where: { id },
      select: this.transactionSelect,
    });

    if (!transaction) {
      throw new CommercialTransactionNotFoundException();
    }

    this.assertAccess(user, transaction);

    const [room, payment] = await Promise.all([
      this.findChatRoomByTransactionId(transaction.id),
      this.prisma.payment.findFirst({
        where: {
          referenceType: PrismaPaymentReferenceType.CommercialTransaction,
          referenceId: transaction.id,
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
      }),
    ]);

    return this.toResponse(transaction, room.id, payment);
  }

  async respond(
    user: User,
    id: number,
    payload: RespondCommercialTransactionDto,
  ): Promise<ResponseCommercialTransactionDto> {
    const transaction = await this.prisma.commercialTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        sellerId: true,
        buyerId: true,
        status: true,
        requestedAmount: true,
      },
    });

    if (!transaction) {
      throw new CommercialTransactionNotFoundException();
    }

    if (transaction.sellerId !== user.id) {
      throw new CommercialTransactionSellerResponseNotAllowedException();
    }

    if (transaction.status !== PrismaCommercialTransactionStatus.Requested) {
      throw new CommercialTransactionPendingResponseOnlyException();
    }

    if (
      payload.status !== CommercialTransactionStatus.Accepted &&
      payload.status !== CommercialTransactionStatus.Rejected
    ) {
      throw new CommercialTransactionInvalidResponseStatusException();
    }

    const agreedAmount =
      payload.status === CommercialTransactionStatus.Accepted
        ? payload.agreedAmount
          ? parsePriceDecimal(payload.agreedAmount)
          : transaction.requestedAmount
        : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.commercialTransaction.update({
        where: { id: transaction.id },
        data: {
          status: payload.status as PrismaCommercialTransactionStatus,
          agreedAmount,
          acceptedAt: payload.status === CommercialTransactionStatus.Accepted ? new Date() : null,
          rejectedAt: payload.status === CommercialTransactionStatus.Rejected ? new Date() : null,
        },
      });

      if (payload.message?.trim()) {
        await this.createChatMessage(tx, transaction.id, user.id, payload.message.trim());
      }
    });

    return this.findById(user, id);
  }

  async pay(
    user: User,
    id: number,
    payload: PayCommercialTransactionDto,
  ): Promise<ResponseCommercialTransactionDto> {
    const transaction = await this.prisma.commercialTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        requestedAmount: true,
        agreedAmount: true,
      },
    });

    if (!transaction) {
      throw new CommercialTransactionNotFoundException();
    }

    if (transaction.buyerId !== user.id) {
      throw new CommercialTransactionBuyerPaymentNotAllowedException();
    }

    if (transaction.status !== PrismaCommercialTransactionStatus.Accepted) {
      throw new CommercialTransactionPaymentBeforeAcceptanceException();
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        referenceType: PrismaPaymentReferenceType.CommercialTransaction,
        referenceId: transaction.id,
      },
      select: { id: true },
    });

    if (existingPayment) {
      throw new CommercialTransactionPaymentAlreadyRegisteredException();
    }

    const amount = transaction.agreedAmount || transaction.requestedAmount;
    const trimmedCardNumber = payload.cardNumber ? payload.cardNumber.replace(/\s+/g, '') : '';
    const cardLast4 =
      trimmedCardNumber.length >= 4
        ? trimmedCardNumber.slice(trimmedCardNumber.length - 4)
        : undefined;

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          method: payload.method as PrismaPaymentMethod,
          status: PrismaPaymentStatus.Paid,
          referenceType: PrismaPaymentReferenceType.CommercialTransaction,
          referenceId: transaction.id,
          holderName: payload.holderName?.trim() || null,
          cardBrand: payload.cardBrand?.trim() || null,
          cardLast4: cardLast4 || null,
          amount,
          paidAt: new Date(),
          payerId: transaction.buyerId,
          receiverId: transaction.sellerId,
        },
      });

      await tx.financialTransaction.createMany({
        data: [
          {
            type: FinancialTransactionType.Debit,
            category: PrismaFinancialTransactionCategory.CommercialTransaction,
            status: PrismaPaymentStatus.Paid,
            amount,
            description: `Pagamento da negociação #${transaction.id}`,
            availableAt: new Date(),
            referenceType: PrismaPaymentReferenceType.CommercialTransaction,
            referenceId: transaction.id,
            userId: transaction.buyerId,
            paymentId: payment.id,
          },
          {
            type: FinancialTransactionType.Credit,
            category: PrismaFinancialTransactionCategory.CommercialTransaction,
            status: PrismaPaymentStatus.Paid,
            amount,
            description: `Recebimento da negociação #${transaction.id}`,
            availableAt: new Date(),
            referenceType: PrismaPaymentReferenceType.CommercialTransaction,
            referenceId: transaction.id,
            userId: transaction.sellerId,
            paymentId: payment.id,
          },
        ],
      });

      await tx.commercialTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PrismaCommercialTransactionStatus.Paid,
          paidAt: new Date(),
        },
      });
    });

    return this.findById(user, id);
  }

  async complete(user: User, id: number): Promise<ResponseCommercialTransactionDto> {
    const transaction = await this.prisma.commercialTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
      },
    });

    if (!transaction) {
      throw new CommercialTransactionNotFoundException();
    }

    if (transaction.buyerId !== user.id) {
      throw new CommercialTransactionBuyerCompletionNotAllowedException();
    }

    if (transaction.status !== PrismaCommercialTransactionStatus.Paid) {
      throw new CommercialTransactionUnpaidCompletionNotAllowedException();
    }

    await this.prisma.commercialTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PrismaCommercialTransactionStatus.Completed,
        completedAt: new Date(),
      },
    });

    return this.findById(user, id);
  }

  async cancel(user: User, id: number): Promise<ResponseCommercialTransactionDto> {
    const transaction = await this.prisma.commercialTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
      },
    });

    if (!transaction) {
      throw new CommercialTransactionNotFoundException();
    }

    const canAccess =
      transaction.buyerId === user.id ||
      transaction.sellerId === user.id ||
      user.role === Role.Admin ||
      user.role === Role.Master;

    if (!canAccess) {
      throw new CommercialTransactionAccessDeniedException();
    }

    if (
      transaction.status === CommercialTransactionStatus.Cancelled ||
      transaction.status === CommercialTransactionStatus.Completed
    ) {
      throw new CommercialTransactionAlreadyFinishedException();
    }

    if (transaction.status === PrismaCommercialTransactionStatus.Paid) {
      throw new CommercialTransactionPaidCancelNotAllowedException();
    }

    await this.prisma.commercialTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PrismaCommercialTransactionStatus.Cancelled,
        cancelledAt: new Date(),
      },
    });

    return this.findById(user, id);
  }

  private buildAccessFilter(
    user: User,
    participantRole: CommercialTransactionParticipantRole,
  ): Prisma.CommercialTransactionWhereInput {
    if (user.role === Role.Admin || user.role === Role.Master) {
      return {};
    }

    if (participantRole === CommercialTransactionParticipantRole.Buyer) {
      return { buyerId: user.id };
    }

    if (participantRole === CommercialTransactionParticipantRole.Seller) {
      return { sellerId: user.id };
    }

    return {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    };
  }

  private assertAccess(user: User, transaction: { buyerId?: number; sellerId?: number }): void {
    const canAccess =
      transaction.buyerId === user.id ||
      transaction.sellerId === user.id ||
      user.role === Role.Admin ||
      user.role === Role.Master;

    if (!canAccess) {
      throw new CommercialTransactionAccessDeniedException();
    }
  }

  private async mapTransactions(transactions: any[]): Promise<ResponseCommercialTransactionDto[]> {
    if (transactions.length === 0) {
      return [];
    }

    const transactionIds = transactions.map((transaction) => transaction.id);
    const [rooms, payments] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where: {
          contextType: ChatContextType.CommercialTransaction,
          referenceId: { in: transactionIds },
        },
        select: {
          id: true,
          referenceId: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          referenceType: PrismaPaymentReferenceType.CommercialTransaction,
          referenceId: { in: transactionIds },
        },
        select: {
          id: true,
          referenceId: true,
          method: true,
          status: true,
          amount: true,
          holderName: true,
          cardBrand: true,
          cardLast4: true,
          paidAt: true,
        },
      }),
    ]);

    const roomMap = new Map(rooms.map((room) => [room.referenceId, room.id]));
    const paymentMap = new Map(payments.map((payment) => [payment.referenceId, payment]));

    return transactions.map((transaction) =>
      this.toResponse(
        transaction,
        roomMap.get(transaction.id) || 0,
        paymentMap.get(transaction.id),
      ),
    );
  }

  private async findChatRoomByTransactionId(id: number) {
    const room = await this.prisma.chatRoom.findUnique({
      where: {
        contextType_referenceId: {
          contextType: ChatContextType.CommercialTransaction,
          referenceId: id,
        },
      },
      select: { id: true },
    });

    if (!room) {
      throw new CommercialTransactionChatNotFoundException();
    }

    return room;
  }

  private async createChatMessage(
    tx: Prisma.TransactionClient,
    transactionId: number,
    senderId: number,
    message: string,
  ): Promise<void> {
    const room = await tx.chatRoom.findUnique({
      where: {
        contextType_referenceId: {
          contextType: ChatContextType.CommercialTransaction,
          referenceId: transactionId,
        },
      },
      select: { id: true },
    });

    if (!room) {
      throw new CommercialTransactionChatNotFoundException();
    }

    await tx.chatMessage.create({
      data: {
        roomId: room.id,
        senderId,
        message,
      },
    });

    await tx.chatRoom.update({
      where: { id: room.id },
      data: { lastMessageAt: new Date() },
    });

    await tx.chatParticipant.update({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: senderId,
        },
      },
      data: { lastReadAt: new Date() },
    });
  }

  private toResponse(
    transaction: any,
    chatRoomId: number,
    payment?: any,
  ): ResponseCommercialTransactionDto {
    return {
      id: transaction.id,
      referenceType: transaction.referenceType as CommercialTransactionReferenceType,
      referenceId: transaction.referenceId,
      status: transaction.status as CommercialTransactionStatus,
      title: transaction.title || undefined,
      description: transaction.description || undefined,
      requestedAmount: transaction.requestedAmount.toFixed(2),
      agreedAmount: transaction.agreedAmount ? transaction.agreedAmount.toFixed(2) : undefined,
      chatRoomId,
      buyer: {
        id: transaction.buyer.id,
        name: transaction.buyer.name,
        fileUrl: transaction.buyer.fileUrl || undefined,
      },
      seller: {
        id: transaction.seller.id,
        name: transaction.seller.name,
        fileUrl: transaction.seller.fileUrl || undefined,
      },
      product:
        transaction.referenceType === CommercialTransactionReferenceType.Product &&
        transaction.product
          ? {
              id: transaction.product.id,
              name: transaction.product.name,
              model: transaction.product.model || undefined,
              price: transaction.product.price.toFixed(2),
              imageUrl: transaction.product.imageUrl || undefined,
            }
          : undefined,
      payment: payment
        ? {
            id: payment.id,
            method: payment.method as PaymentMethod,
            status: payment.status as PaymentStatus,
            amount: payment.amount.toFixed(2),
            holderName: payment.holderName || undefined,
            cardBrand: payment.cardBrand || undefined,
            cardLast4: payment.cardLast4 || undefined,
            paidAt: payment.paidAt || undefined,
          }
        : undefined,
      acceptedAt: transaction.acceptedAt || undefined,
      rejectedAt: transaction.rejectedAt || undefined,
      cancelledAt: transaction.cancelledAt || undefined,
      paidAt: transaction.paidAt || undefined,
      completedAt: transaction.completedAt || undefined,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
