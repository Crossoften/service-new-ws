import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { ChatContextType, Prisma, Role, User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PaymentReferenceTypeEnum } from '../works/enums/payment-reference-type.enum';
import { ProductNotFoundException } from '../products/exceptions/product-not-found.exception';
import { PaymentMethodEnum } from '../works/enums/payment-method.enum';
import { PaymentStatusEnum } from '../works/enums/payment-status.enum';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateCommercialTransactionDto } from './dto/create-commercial-transaction.dto';
import { PayCommercialTransactionDto } from './dto/pay-commercial-transaction.dto';
import {
  CreateCommercialTransactionResponseDto,
  PayCommercialTransactionResponseDto,
  ResponseCommercialTransactionDto,
  ResponseFindAllCommercialTransactionDto,
} from './dto/response-commercial-transaction.dto';
import { QueryCommercialTransactionDto } from './dto/query-commercial-transaction.dto';
import { RespondCommercialTransactionDto } from './dto/respond-commercial-transaction.dto';
import { CommercialTransactionParticipantRoleEnum } from './enums/commercial-transaction-participant-role.enum';
import { CommercialTransactionReferenceTypeEnum } from './enums/commercial-transaction-reference-type.enum';
import { CommercialTransactionStatusEnum } from './enums/commercial-transaction-status.enum';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly whatsappService: WhatsappService,
  ) {}

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
    if (payload.referenceType !== CommercialTransactionReferenceTypeEnum.Product) {
      throw new CommercialTransactionUnsupportedReferenceTypeException();
    }

    const product = await this.prisma.product.findUnique({
      where: { id: payload.referenceId },
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
    const requestedAmount = new Prisma.Decimal(payload.requestedAmount);
    const defaultMessage = `Solicitação enviada no valor de R$ ${requestedAmount.toFixed(2)}.`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.commercialTransaction.create({
        data: {
          referenceType: CommercialTransactionReferenceTypeEnum.Product,
          referenceId: payload.referenceId,
          status: CommercialTransactionStatusEnum.Requested,
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
    const take = query.take ?? 10;
    const page = query.skip ?? 1;
    const search = query.search?.trim() || undefined;
    const participantRole = query.participantRole || CommercialTransactionParticipantRoleEnum.All;

    let accessFilter: Prisma.CommercialTransactionWhereInput;
    if (user.role === Role.Admin || user.role === Role.Master) {
      accessFilter = {};
    } else if (participantRole === CommercialTransactionParticipantRoleEnum.Buyer) {
      accessFilter = { buyerId: user.id };
    } else if (participantRole === CommercialTransactionParticipantRoleEnum.Seller) {
      accessFilter = { sellerId: user.id };
    } else {
      accessFilter = { OR: [{ buyerId: user.id }, { sellerId: user.id }] };
    }

    const where: Prisma.CommercialTransactionWhereInput = {
      status: query.status as CommercialTransactionStatusEnum | undefined,
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

    if (transactions.length === 0) {
      return {
        transactions: [],
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalRecords / take)),
        totalRecords,
      };
    }

    const transactionIds = transactions.map((t) => t.id);
    const [rooms, payments] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where: {
          contextType: ChatContextType.CommercialTransaction,
          referenceId: { in: transactionIds },
        },
        select: { id: true, referenceId: true },
      }),
      this.prisma.payment.findMany({
        where: {
          referenceType: PaymentReferenceTypeEnum.CommercialTransaction,
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

    return {
      transactions: transactions.map((transaction) => {
        const payment = paymentMap.get(transaction.id);
        return {
          id: transaction.id,
          referenceType: transaction.referenceType as CommercialTransactionReferenceTypeEnum,
          referenceId: transaction.referenceId,
          status: transaction.status as CommercialTransactionStatusEnum,
          title: transaction.title || undefined,
          description: transaction.description || undefined,
          requestedAmount: transaction.requestedAmount.toFixed(2),
          agreedAmount: transaction.agreedAmount ? transaction.agreedAmount.toFixed(2) : undefined,
          chatRoomId: roomMap.get(transaction.id) || 0,
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
            transaction.referenceType === CommercialTransactionReferenceTypeEnum.Product &&
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
                method: payment.method as PaymentMethodEnum,
                status: payment.status as PaymentStatusEnum,
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
      }),
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

    const canAccess =
      transaction.buyerId === user.id ||
      transaction.sellerId === user.id ||
      user.role === Role.Admin ||
      user.role === Role.Master;

    if (!canAccess) {
      throw new CommercialTransactionAccessDeniedException();
    }

    const [room, payment] = await Promise.all([
      this.prisma.chatRoom.findUnique({
        where: {
          contextType_referenceId: {
            contextType: ChatContextType.CommercialTransaction,
            referenceId: transaction.id,
          },
        },
        select: { id: true },
      }),
      this.prisma.payment.findFirst({
        where: {
          referenceType: PaymentReferenceTypeEnum.CommercialTransaction,
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

    if (!room) {
      throw new CommercialTransactionChatNotFoundException();
    }

    return {
      id: transaction.id,
      referenceType: transaction.referenceType as CommercialTransactionReferenceTypeEnum,
      referenceId: transaction.referenceId,
      status: transaction.status as CommercialTransactionStatusEnum,
      title: transaction.title || undefined,
      description: transaction.description || undefined,
      requestedAmount: transaction.requestedAmount.toFixed(2),
      agreedAmount: transaction.agreedAmount ? transaction.agreedAmount.toFixed(2) : undefined,
      chatRoomId: room.id,
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
        transaction.referenceType === CommercialTransactionReferenceTypeEnum.Product &&
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
            method: payment.method as PaymentMethodEnum,
            status: payment.status as PaymentStatusEnum,
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

    if (transaction.status !== CommercialTransactionStatusEnum.Requested) {
      throw new CommercialTransactionPendingResponseOnlyException();
    }

    if (
      payload.status !== CommercialTransactionStatusEnum.Accepted &&
      payload.status !== CommercialTransactionStatusEnum.Rejected
    ) {
      throw new CommercialTransactionInvalidResponseStatusException();
    }

    const agreedAmount =
      payload.status === CommercialTransactionStatusEnum.Accepted
        ? payload.agreedAmount !== undefined
          ? new Prisma.Decimal(payload.agreedAmount)
          : transaction.requestedAmount
        : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.commercialTransaction.update({
        where: { id: transaction.id },
        data: {
          status: payload.status as CommercialTransactionStatusEnum,
          agreedAmount,
          acceptedAt:
            payload.status === CommercialTransactionStatusEnum.Accepted ? new Date() : null,
          rejectedAt:
            payload.status === CommercialTransactionStatusEnum.Rejected ? new Date() : null,
        },
      });

      if (payload.message?.trim()) {
        const room = await tx.chatRoom.findUnique({
          where: {
            contextType_referenceId: {
              contextType: ChatContextType.CommercialTransaction,
              referenceId: transaction.id,
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
            senderId: user.id,
            message: payload.message.trim(),
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
              userId: user.id,
            },
          },
          data: { lastReadAt: new Date() },
        });
      }
    });

    void this.whatsappService.notifyUser(
      transaction.buyerId,
      payload.status === CommercialTransactionStatusEnum.Accepted
        ? `Olá! Sua negociação #${transaction.id} foi aceita pelo vendedor. Finalize o pagamento para prosseguir.`
        : `Olá! Sua negociação #${transaction.id} foi recusada pelo vendedor.`,
    );

    return this.findById(user, id);
  }

  async pay(
    user: User,
    id: number,
    payload: PayCommercialTransactionDto,
  ): Promise<PayCommercialTransactionResponseDto> {
    const transaction = await this.prisma.commercialTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        requestedAmount: true,
        agreedAmount: true,
        seller: {
          select: {
            id: true,
            mpUserId: true,
            mpAccessToken: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new CommercialTransactionNotFoundException();
    }

    if (transaction.buyerId !== user.id) {
      throw new CommercialTransactionBuyerPaymentNotAllowedException();
    }

    this.mercadoPagoService.verifySellerLinked(transaction.seller);

    if (transaction.status !== CommercialTransactionStatusEnum.Accepted) {
      throw new CommercialTransactionPaymentBeforeAcceptanceException();
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        referenceType: PaymentReferenceTypeEnum.CommercialTransaction,
        referenceId: transaction.id,
      },
      select: { id: true },
    });

    if (existingPayment) {
      throw new CommercialTransactionPaymentAlreadyRegisteredException();
    }

    const amount = transaction.agreedAmount || transaction.requestedAmount;
    const externalReference = randomUUID();

    const { preferenceId, checkoutUrl } = await this.mercadoPagoService.createPreference({
      title: `Negociação #${transaction.id}`,
      unitPrice: Number(amount),
      externalReference,
      payerEmail: payload.payerEmail,
      sellerMpUserId: transaction.seller.mpUserId || undefined,
      sellerAccessToken: transaction.seller.mpAccessToken || undefined,
      applyMarketplaceSplit: true,
    });

    await this.prisma.payment.create({
      data: {
        status: PaymentStatusEnum.Pending,
        referenceType: PaymentReferenceTypeEnum.CommercialTransaction,
        referenceId: transaction.id,
        amount,
        payerId: transaction.buyerId,
        receiverId: transaction.sellerId,
        externalReference,
        mpPreferenceId: preferenceId,
      },
    });

    return {
      message: 'Checkout de pagamento gerado com sucesso.',
      checkoutUrl,
      transaction: await this.findById(user, id),
    };
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

    if (transaction.status !== CommercialTransactionStatusEnum.Paid) {
      throw new CommercialTransactionUnpaidCompletionNotAllowedException();
    }

    await this.prisma.commercialTransaction.update({
      where: { id: transaction.id },
      data: {
        status: CommercialTransactionStatusEnum.Completed,
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
      transaction.status === CommercialTransactionStatusEnum.Cancelled ||
      transaction.status === CommercialTransactionStatusEnum.Completed
    ) {
      throw new CommercialTransactionAlreadyFinishedException();
    }

    if (transaction.status === CommercialTransactionStatusEnum.Paid) {
      throw new CommercialTransactionPaidCancelNotAllowedException();
    }

    await this.prisma.commercialTransaction.update({
      where: { id: transaction.id },
      data: {
        status: CommercialTransactionStatusEnum.Cancelled,
        cancelledAt: new Date(),
      },
    });

    return this.findById(user, id);
  }
}
