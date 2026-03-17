import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { parsePositiveInt } from '@utils/parsePositiveInt';
import { parsePriceDecimal } from '@utils/parsePriceDecimal';
import { BudgetStatus } from '../budgets/enums/budget-status.enum';
import { CreateWorkResponseDto } from './dto/create-work-response.dto';
import { CreateWorkDto } from './dto/create-work.dto';
import { CancelWorkDto } from './dto/cancel-work.dto';
import { FinishWorkDto } from './dto/finish-work.dto';
import { PayWorkDto } from './dto/pay-work.dto';
import { PayWorkResponseDto } from './dto/pay-work-response.dto';
import { QueryWorkDto } from './dto/query-work.dto';
import { ResponseFindAllWorkDto } from './dto/response-find-all-work.dto';
import { ResponseWorkDto } from './dto/response-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentReferenceType } from './enums/payment-reference-type.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { FinancialTransactionCategory } from './enums/financial-transaction-category.enum';
import { FinancialTransactionType } from './enums/financial-transaction-type.enum';
import { WorkFileType } from './enums/work-file-type.enum';
import { WorkScope } from './enums/work-scope.enum';
import { WorkStatus } from './enums/work-status.enum';
import { WorkAccessDeniedException } from './exceptions/work-access-denied.exception';
import { WorkBudgetAlreadyHasWorkException } from './exceptions/work-budget-already-has-work.exception';
import { WorkBudgetNotFoundException } from './exceptions/work-budget-not-found.exception';
import { WorkBudgetNotRespondedException } from './exceptions/work-budget-not-responded.exception';
import { WorkCreateFailedException } from './exceptions/work-create-failed.exception';
import { WorkNotFoundException } from './exceptions/work-not-found.exception';
import { WorkPaymentAlreadyRegisteredException } from './exceptions/work-payment-already-registered.exception';
import { WorkPaymentNotAllowedException } from './exceptions/work-payment-not-allowed.exception';
import { WorkPaymentOnlyAfterFinishException } from './exceptions/work-payment-only-after-finish.exception';
import { WorkUpdateFailedException } from './exceptions/work-update-failed.exception';

@Injectable()
export class WorksService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly workSelect = Prisma.validator<Prisma.WorkSelect>()({
    id: true,
    status: true,
    details: true,
    completionDescription: true,
    cancelReason: true,
    serviceDate: true,
    startedAt: true,
    finishedAt: true,
    cancelledAt: true,
    serviceValue: true,
    totalValue: true,
    budgetId: true,
    serviceId: true,
    requesterId: true,
    providerId: true,
    createdAt: true,
    updatedAt: true,
    budget: {
      select: {
        id: true,
      },
    },
    service: {
      select: {
        id: true,
        name: true,
      },
    },
    requester: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        fileUrl: true,
      },
    },
    provider: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        fileUrl: true,
      },
    },
    files: {
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileKey: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    },
  });

  private readonly workListSelect = Prisma.validator<Prisma.WorkSelect>()({
    id: true,
    status: true,
    serviceDate: true,
    startedAt: true,
    finishedAt: true,
    cancelledAt: true,
    serviceValue: true,
    totalValue: true,
    createdAt: true,
    budget: {
      select: {
        id: true,
      },
    },
    service: {
      select: {
        id: true,
        name: true,
      },
    },
    requester: {
      select: {
        id: true,
        name: true,
        fileUrl: true,
      },
    },
    provider: {
      select: {
        id: true,
        name: true,
        fileUrl: true,
      },
    },
  });

  async create(user: User, payload: CreateWorkDto): Promise<CreateWorkResponseDto> {
    const budgetId = parsePositiveInt(payload.budgetId, 'budgetId');
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      select: {
        id: true,
        status: true,
        serviceId: true,
        requesterId: true,
        providerId: true,
        description: true,
        responseValue: true,
        files: {
          select: {
            fileName: true,
            fileUrl: true,
            fileKey: true,
          },
        },
        work: {
          select: { id: true },
        },
      },
    });

    if (!budget) {
      throw new WorkBudgetNotFoundException();
    }

    if (budget.status !== BudgetStatus.Responded) {
      throw new WorkBudgetNotRespondedException();
    }

    if (budget.work) {
      throw new WorkBudgetAlreadyHasWorkException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (budget.providerId !== user.id && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    try {
      const work = await this.prisma.work.create({
        data: {
          details: payload.details ? payload.details.trim() : budget.description,
          serviceDate: payload.serviceDate ? new Date(payload.serviceDate) : null,
          serviceValue: payload.serviceValue
            ? parsePriceDecimal(payload.serviceValue)
            : budget.responseValue,
          totalValue: payload.totalValue
            ? parsePriceDecimal(payload.totalValue)
            : budget.responseValue,
          budgetId: budget.id,
          serviceId: budget.serviceId,
          requesterId: budget.requesterId,
          providerId: budget.providerId,
          startedAt: new Date(),
          files: {
            create: [
              ...budget.files.map((file) => ({
                fileName: file.fileName,
                fileUrl: file.fileUrl,
                fileKey: file.fileKey,
                type: WorkFileType.Requester,
              })),
              ...((payload.providerFiles || []).map((file) => ({
                fileName: file.fileName,
                fileUrl: file.fileUrl,
                fileKey: file.fileKey,
                type: WorkFileType.Provider,
              })) as Array<{
                fileName: string;
                fileUrl: string;
                fileKey: string;
                type: WorkFileType;
              }>),
            ],
          },
        },
        select: this.workSelect,
      });

      await this.prisma.budget.update({
        where: { id: budget.id },
        data: { status: BudgetStatus.Responded },
      });

      const payment = await this.prisma.payment.findFirst({
        where: {
          referenceType: PaymentReferenceType.Work,
          referenceId: work.id,
        },
      });

      return {
        message: 'Trabalho cadastrado com sucesso.',
        work: {
          id: work.id,
          status: work.status as WorkStatus,
          details: work.details,
          completionDescription: work.completionDescription,
          cancelReason: work.cancelReason,
          serviceDate: work.serviceDate,
          startedAt: work.startedAt,
          finishedAt: work.finishedAt,
          cancelledAt: work.cancelledAt,
          serviceValue: work.serviceValue ? work.serviceValue.toFixed(2) : undefined,
          totalValue: work.totalValue ? work.totalValue.toFixed(2) : undefined,
          budgetId: work.budgetId,
          budget: work.budget,
          serviceId: work.serviceId,
          service: work.service,
          requesterId: work.requesterId,
          requester: work.requester,
          providerId: work.providerId,
          provider: work.provider,
          files: work.files.map((file) => ({
            id: file.id,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileKey: file.fileKey,
            type: file.type as WorkFileType,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          })),
          createdAt: work.createdAt,
          updatedAt: work.updatedAt,
          payment: payment
            ? {
                id: payment.id,
                method: payment.method as PaymentMethod,
                status: payment.status as PaymentStatus,
                holderName: payment.holderName || undefined,
                cardBrand: payment.cardBrand || undefined,
                cardLast4: payment.cardLast4 || undefined,
                amount: payment.amount.toFixed(2),
                paidAt: payment.paidAt || undefined,
              }
            : undefined,
        },
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new WorkCreateFailedException();
      }

      throw error;
    }
  }

  async findAll(user: User, query: QueryWorkDto): Promise<ResponseFindAllWorkDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const serviceId = query.serviceId ? parsePositiveInt(query.serviceId, 'serviceId') : undefined;
    const search = query.search ? query.search.trim() : undefined;
    const scope = query.scope || WorkScope.Received;

    const where: Prisma.WorkWhereInput = {
      status: query.status,
      serviceId,
      requesterId: scope === WorkScope.Requested ? user.id : undefined,
      providerId: scope === WorkScope.Received ? user.id : undefined,
      OR: search
        ? [
            { requester: { name: { contains: search } } },
            { provider: { name: { contains: search } } },
            { service: { name: { contains: search } } },
          ]
        : undefined,
    };

    const [works, totalRecords] = await Promise.all([
      this.prisma.work.findMany({
        where,
        select: this.workListSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.work.count({ where }),
    ]);

    const payments =
      works.length > 0
        ? await this.prisma.payment.findMany({
            where: {
              referenceType: PaymentReferenceType.Work,
              referenceId: { in: works.map((work) => work.id) },
            },
          })
        : [];
    const paymentMap = new Map(payments.map((payment) => [payment.referenceId, payment]));

    return {
      works: works.map((work) => ({
        id: work.id,
        status: work.status as WorkStatus,
        serviceDate: work.serviceDate,
        startedAt: work.startedAt,
        finishedAt: work.finishedAt,
        cancelledAt: work.cancelledAt,
        serviceValue: work.serviceValue ? work.serviceValue.toFixed(2) : undefined,
        totalValue: work.totalValue ? work.totalValue.toFixed(2) : undefined,
        budget: work.budget,
        service: work.service,
        requester: {
          id: work.requester.id,
          name: work.requester.name,
          fileUrl: work.requester.fileUrl,
        },
        provider: {
          id: work.provider.id,
          name: work.provider.name,
          fileUrl: work.provider.fileUrl,
        },
        createdAt: work.createdAt,
        payment: paymentMap.get(work.id)
          ? {
              id: paymentMap.get(work.id)!.id,
              method: paymentMap.get(work.id)!.method as PaymentMethod,
              status: paymentMap.get(work.id)!.status as PaymentStatus,
              holderName: paymentMap.get(work.id)!.holderName || undefined,
              cardBrand: paymentMap.get(work.id)!.cardBrand || undefined,
              cardLast4: paymentMap.get(work.id)!.cardLast4 || undefined,
              amount: paymentMap.get(work.id)!.amount.toFixed(2),
              paidAt: paymentMap.get(work.id)!.paidAt || undefined,
            }
          : undefined,
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findMyRequests(user: User, query: QueryWorkDto): Promise<ResponseFindAllWorkDto> {
    return this.findAll(user, {
      ...query,
      scope: WorkScope.Requested,
    });
  }

  async findById(user: User, id: number): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: this.workSelect,
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const canAccess = work.requesterId === user.id || work.providerId === user.id || isAdmin;

    if (!canAccess) {
      throw new WorkAccessDeniedException();
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        referenceType: PaymentReferenceType.Work,
        referenceId: work.id,
      },
    });

    return {
      id: work.id,
      status: work.status as WorkStatus,
      details: work.details,
      completionDescription: work.completionDescription,
      cancelReason: work.cancelReason,
      serviceDate: work.serviceDate,
      startedAt: work.startedAt,
      finishedAt: work.finishedAt,
      cancelledAt: work.cancelledAt,
      serviceValue: work.serviceValue ? work.serviceValue.toFixed(2) : undefined,
      totalValue: work.totalValue ? work.totalValue.toFixed(2) : undefined,
      budgetId: work.budgetId,
      budget: work.budget,
      serviceId: work.serviceId,
      service: work.service,
      requesterId: work.requesterId,
      requester: work.requester,
      providerId: work.providerId,
      provider: work.provider,
      files: work.files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileKey: file.fileKey,
        type: file.type as WorkFileType,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })),
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
      payment: payment
        ? {
            id: payment.id,
            method: payment.method as PaymentMethod,
            status: payment.status as PaymentStatus,
            holderName: payment.holderName || undefined,
            cardBrand: payment.cardBrand || undefined,
            cardLast4: payment.cardLast4 || undefined,
            amount: payment.amount.toFixed(2),
            paidAt: payment.paidAt || undefined,
          }
        : undefined,
    };
  }

  async update(user: User, id: number, payload: UpdateWorkDto): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: { id: true, requesterId: true, providerId: true },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isProvider = work.providerId === user.id;

    if (!isProvider && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    try {
      await this.prisma.work.update({
        where: { id },
        data: {
          details:
            payload.details !== undefined
              ? payload.details
                ? payload.details.trim()
                : null
              : undefined,
          completionDescription:
            payload.completionDescription !== undefined
              ? payload.completionDescription
                ? payload.completionDescription.trim()
                : null
              : undefined,
          cancelReason:
            payload.cancelReason !== undefined
              ? payload.cancelReason
                ? payload.cancelReason.trim()
                : null
              : undefined,
          serviceDate: payload.serviceDate ? new Date(payload.serviceDate) : undefined,
          serviceValue: payload.serviceValue ? parsePriceDecimal(payload.serviceValue) : undefined,
          totalValue: payload.totalValue ? parsePriceDecimal(payload.totalValue) : undefined,
          files:
            payload.requesterFiles || payload.providerFiles || payload.completionFiles
              ? {
                  deleteMany: {
                    type: {
                      in: [
                        ...(payload.requesterFiles ? [WorkFileType.Requester] : []),
                        ...(payload.providerFiles ? [WorkFileType.Provider] : []),
                        ...(payload.completionFiles ? [WorkFileType.Completion] : []),
                      ],
                    },
                  },
                  create: [
                    ...((payload.requesterFiles || []).map((file) => ({
                      fileName: file.fileName,
                      fileUrl: file.fileUrl,
                      fileKey: file.fileKey,
                      type: WorkFileType.Requester,
                    })) as Array<{
                      fileName: string;
                      fileUrl: string;
                      fileKey: string;
                      type: WorkFileType;
                    }>),
                    ...((payload.providerFiles || []).map((file) => ({
                      fileName: file.fileName,
                      fileUrl: file.fileUrl,
                      fileKey: file.fileKey,
                      type: WorkFileType.Provider,
                    })) as Array<{
                      fileName: string;
                      fileUrl: string;
                      fileKey: string;
                      type: WorkFileType;
                    }>),
                    ...((payload.completionFiles || []).map((file) => ({
                      fileName: file.fileName,
                      fileUrl: file.fileUrl,
                      fileKey: file.fileKey,
                      type: WorkFileType.Completion,
                    })) as Array<{
                      fileName: string;
                      fileUrl: string;
                      fileKey: string;
                      type: WorkFileType;
                    }>),
                  ],
                }
              : undefined,
        },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new WorkUpdateFailedException();
      }

      throw error;
    }

    return this.findById(user, id);
  }

  async start(user: User, id: number): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: { id: true, providerId: true, status: true },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (work.providerId !== user.id && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        status: WorkStatus.InProgress,
        startedAt: new Date(),
        cancelledAt: null,
      },
    });

    return this.findById(user, id);
  }

  async finish(user: User, id: number, payload: FinishWorkDto): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: { id: true, providerId: true },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (work.providerId !== user.id && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        status: WorkStatus.Finished,
        completionDescription: payload.completionDescription.trim(),
        serviceDate: payload.serviceDate ? new Date(payload.serviceDate) : undefined,
        serviceValue: payload.serviceValue ? parsePriceDecimal(payload.serviceValue) : undefined,
        totalValue: payload.totalValue ? parsePriceDecimal(payload.totalValue) : undefined,
        finishedAt: new Date(),
        files: payload.completionFiles
          ? {
              deleteMany: { type: WorkFileType.Completion },
              create: payload.completionFiles.map((file) => ({
                fileName: file.fileName,
                fileUrl: file.fileUrl,
                fileKey: file.fileKey,
                type: WorkFileType.Completion,
              })),
            }
          : undefined,
      },
    });

    return this.findById(user, id);
  }

  async pay(user: User, id: number, payload: PayWorkDto): Promise<PayWorkResponseDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        requesterId: true,
        providerId: true,
        totalValue: true,
        serviceValue: true,
      },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    if (work.requesterId !== user.id) {
      throw new WorkPaymentNotAllowedException();
    }

    if (work.status !== WorkStatus.Finished) {
      throw new WorkPaymentOnlyAfterFinishException();
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        referenceType: PaymentReferenceType.Work,
        referenceId: work.id,
      },
      select: { id: true },
    });

    if (existingPayment) {
      throw new WorkPaymentAlreadyRegisteredException();
    }

    const amount = work.totalValue || work.serviceValue;

    if (!amount) {
      throw new WorkPaymentOnlyAfterFinishException();
    }

    const trimmedCardNumber = payload.cardNumber ? payload.cardNumber.replace(/\s+/g, '') : '';
    const cardLast4 =
      trimmedCardNumber.length >= 4
        ? trimmedCardNumber.slice(trimmedCardNumber.length - 4)
        : undefined;

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          method: payload.method,
          status: PaymentStatus.Paid,
          referenceType: PaymentReferenceType.Work,
          referenceId: work.id,
          holderName: payload.holderName ? payload.holderName.trim() : null,
          cardBrand: payload.cardBrand ? payload.cardBrand.trim() : null,
          cardLast4: cardLast4 || null,
          amount,
          paidAt: new Date(),
          payerId: work.requesterId,
          receiverId: work.providerId,
        },
      });

      await tx.financialTransaction.createMany({
        data: [
          {
            type: FinancialTransactionType.Debit,
            category: FinancialTransactionCategory.WorkPayment,
            status: PaymentStatus.Paid,
            amount,
            description: `Pagamento do trabalho #${work.id}`,
            availableAt: new Date(),
            referenceType: PaymentReferenceType.Work,
            referenceId: work.id,
            userId: work.requesterId,
            paymentId: payment.id,
          },
          {
            type: FinancialTransactionType.Credit,
            category: FinancialTransactionCategory.WorkPayment,
            status: PaymentStatus.Paid,
            amount,
            description: `Recebimento do trabalho #${work.id}`,
            availableAt: new Date(),
            referenceType: PaymentReferenceType.Work,
            referenceId: work.id,
            userId: work.providerId,
            paymentId: payment.id,
          },
        ],
      });
    });

    return {
      message: 'Pagamento registrado com sucesso.',
      work: await this.findById(user, id),
    };
  }

  async cancel(user: User, id: number, payload: CancelWorkDto): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: { id: true, requesterId: true, providerId: true },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const canCancel = work.requesterId === user.id || work.providerId === user.id || isAdmin;

    if (!canCancel) {
      throw new WorkAccessDeniedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        status: WorkStatus.Cancelled,
        cancelReason: payload.cancelReason.trim(),
        cancelledAt: new Date(),
      },
    });

    return this.findById(user, id);
  }

  async delete(user: User, id: number): Promise<ImessageEntity> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: { id: true, requesterId: true, providerId: true },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const canDelete = work.requesterId === user.id || work.providerId === user.id || isAdmin;

    if (!canDelete) {
      throw new WorkAccessDeniedException();
    }

    await this.prisma.work.delete({ where: { id } });

    return { message: 'Trabalho deletado com sucesso.' };
  }
}
