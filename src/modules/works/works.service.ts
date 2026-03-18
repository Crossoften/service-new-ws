import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import {
  ChatContextType,
  ExtraRequestStatus,
  Prisma,
  Role,
  User,
  WarrantyRequestStatus,
} from '@prisma/client';
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
import { RequestWorkExtraDto } from './dto/request-work-extra.dto';
import { RequestWorkWarrantyDto } from './dto/request-work-warranty.dto';
import { RespondWorkExtraDto } from './dto/respond-work-extra.dto';
import { RespondWorkWarrantyDto } from './dto/respond-work-warranty.dto';
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
    arrivalConfirmedAt: true,
    finishedAt: true,
    cancelledAt: true,
    warrantyExpiresAt: true,
    warrantyRequestedAt: true,
    warrantyRequestDescription: true,
    warrantyRequestStatus: true,
    warrantyResponseDescription: true,
    warrantyRespondedAt: true,
    extraRequestValue: true,
    extraRequestDescription: true,
    extraRequestStatus: true,
    extraRequestedAt: true,
    extraRespondedAt: true,
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
  } as Prisma.WorkSelect);

  private readonly workListSelect = Prisma.validator<Prisma.WorkSelect>()({
    id: true,
    status: true,
    serviceDate: true,
    startedAt: true,
    arrivalConfirmedAt: true,
    finishedAt: true,
    cancelledAt: true,
    warrantyExpiresAt: true,
    warrantyRequestedAt: true,
    warrantyRequestStatus: true,
    extraRequestStatus: true,
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

  private async getWorkChatMap(workIds: number[]) {
    if (workIds.length === 0) {
      return new Map<number, { id: number }>();
    }

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        contextType: ChatContextType.Work,
        referenceId: { in: workIds },
      },
      select: {
        id: true,
        referenceId: true,
      },
    });

    return new Map(rooms.map((room) => [room.referenceId, { id: room.id }]));
  }

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
      const work = await this.prisma.$transaction(async (tx) => {
        const createdWork = await tx.work.create({
          data: {
            status: WorkStatus.Pending,
            details: payload.details ? payload.details.trim() : budget.description,
            serviceDate: payload.serviceDate ? new Date(payload.serviceDate) : null,
            warrantyExpiresAt: payload.warrantyExpiresAt
              ? new Date(payload.warrantyExpiresAt)
              : null,
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
        await tx.chatRoom.create({
          data: {
            contextType: ChatContextType.Work,
            referenceId: createdWork.id,
            createdById: user.id,
            participants: {
              create: [
                {
                  userId: budget.requesterId,
                  lastReadAt: budget.requesterId === user.id ? new Date() : null,
                },
                {
                  userId: budget.providerId,
                  lastReadAt: budget.providerId === user.id ? new Date() : null,
                },
              ],
            },
          },
        });

        return createdWork;
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
      const chatMap = await this.getWorkChatMap([work.id]);
      const workWithWarrantyResponse = work as typeof work & {
        warrantyResponseDescription?: string | null;
        warrantyRespondedAt?: Date | null;
      };

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
          arrivalConfirmedAt: work.arrivalConfirmedAt || undefined,
          finishedAt: work.finishedAt,
          cancelledAt: work.cancelledAt,
          warrantyExpiresAt: work.warrantyExpiresAt || undefined,
          isUnderWarranty:
            !!work.warrantyExpiresAt &&
            work.status === WorkStatus.Finished &&
            work.warrantyExpiresAt.getTime() >= Date.now(),
          warrantyRequestStatus: work.warrantyRequestStatus || undefined,
          warrantyRequestedAt: work.warrantyRequestedAt || undefined,
          warrantyResponseDescription:
            workWithWarrantyResponse.warrantyResponseDescription || undefined,
          warrantyRespondedAt: workWithWarrantyResponse.warrantyRespondedAt || undefined,
          extraRequestValue: work.extraRequestValue ? work.extraRequestValue.toFixed(2) : undefined,
          extraRequestDescription: work.extraRequestDescription || undefined,
          extraRequestStatus: work.extraRequestStatus || undefined,
          extraRequestedAt: work.extraRequestedAt || undefined,
          extraRespondedAt: work.extraRespondedAt || undefined,
          chat: chatMap.get(work.id),
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
    const chatMap = await this.getWorkChatMap(works.map((work) => work.id));

    return {
      works: works.map((work) => ({
        id: work.id,
        status: work.status as WorkStatus,
        serviceDate: work.serviceDate,
        startedAt: work.startedAt,
        arrivalConfirmedAt: work.arrivalConfirmedAt || undefined,
        finishedAt: work.finishedAt,
        cancelledAt: work.cancelledAt,
        warrantyExpiresAt: work.warrantyExpiresAt || undefined,
        isUnderWarranty:
          !!work.warrantyExpiresAt &&
          work.status === WorkStatus.Finished &&
          work.warrantyExpiresAt.getTime() >= Date.now(),
        warrantyRequestStatus: work.warrantyRequestStatus || undefined,
        warrantyRequestedAt: work.warrantyRequestedAt || undefined,
        extraRequestStatus: work.extraRequestStatus || undefined,
        chat: chatMap.get(work.id),
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
    const chatMap = await this.getWorkChatMap([work.id]);
    const workWithWarrantyResponse = work as typeof work & {
      warrantyResponseDescription?: string | null;
      warrantyRespondedAt?: Date | null;
    };

    return {
      id: work.id,
      status: work.status as WorkStatus,
      details: work.details,
      completionDescription: work.completionDescription,
      cancelReason: work.cancelReason,
      serviceDate: work.serviceDate,
      startedAt: work.startedAt,
      arrivalConfirmedAt: work.arrivalConfirmedAt || undefined,
      finishedAt: work.finishedAt,
      cancelledAt: work.cancelledAt,
      warrantyExpiresAt: work.warrantyExpiresAt || undefined,
      warrantyRequestedAt: work.warrantyRequestedAt || undefined,
      warrantyRequestDescription: work.warrantyRequestDescription || undefined,
      warrantyRequestStatus: work.warrantyRequestStatus || undefined,
      warrantyResponseDescription:
        workWithWarrantyResponse.warrantyResponseDescription || undefined,
      warrantyRespondedAt: workWithWarrantyResponse.warrantyRespondedAt || undefined,
      extraRequestValue: work.extraRequestValue ? work.extraRequestValue.toFixed(2) : undefined,
      extraRequestDescription: work.extraRequestDescription || undefined,
      extraRequestStatus: work.extraRequestStatus || undefined,
      extraRequestedAt: work.extraRequestedAt || undefined,
      extraRespondedAt: work.extraRespondedAt || undefined,
      isUnderWarranty:
        !!work.warrantyExpiresAt &&
        work.status === WorkStatus.Finished &&
        work.warrantyExpiresAt.getTime() >= Date.now(),
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
      chat: chatMap.get(work.id),
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
      select: { id: true, requesterId: true, providerId: true, status: true },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isRequester = work.requesterId === user.id;
    const isProvider = work.providerId === user.id;
    const requesterIsEditingOnlyRequesterFiles =
      payload.requesterFiles !== undefined &&
      payload.details === undefined &&
      payload.serviceDate === undefined &&
      payload.warrantyExpiresAt === undefined &&
      payload.serviceValue === undefined &&
      payload.totalValue === undefined &&
      payload.providerFiles === undefined &&
      payload.completionFiles === undefined &&
      payload.completionDescription === undefined &&
      payload.cancelReason === undefined;

    if (!isProvider && !isAdmin && !(isRequester && requesterIsEditingOnlyRequesterFiles)) {
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
          warrantyExpiresAt:
            payload.warrantyExpiresAt !== undefined
              ? payload.warrantyExpiresAt
                ? new Date(payload.warrantyExpiresAt)
                : null
              : undefined,
          serviceValue: payload.serviceValue ? parsePriceDecimal(payload.serviceValue) : undefined,
          totalValue: payload.totalValue ? parsePriceDecimal(payload.totalValue) : undefined,
          files:
            payload.requesterFiles || payload.providerFiles || payload.completionFiles
              ? {
                  deleteMany: {
                    type: {
                      in: [
                        ...(payload.requesterFiles ? [WorkFileType.Requester] : []),
                        ...((payload.providerFiles && !isRequester) || isAdmin
                          ? [WorkFileType.Provider]
                          : []),
                        ...((payload.completionFiles && !isRequester) || isAdmin
                          ? [WorkFileType.Completion]
                          : []),
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
                    ...(((isRequester && !isAdmin ? [] : payload.providerFiles) || []).map(
                      (file) => ({
                        fileName: file.fileName,
                        fileUrl: file.fileUrl,
                        fileKey: file.fileKey,
                        type: WorkFileType.Provider,
                      }),
                    ) as Array<{
                      fileName: string;
                      fileUrl: string;
                      fileKey: string;
                      type: WorkFileType;
                    }>),
                    ...(((isRequester && !isAdmin ? [] : payload.completionFiles) || []).map(
                      (file) => ({
                        fileName: file.fileName,
                        fileUrl: file.fileUrl,
                        fileKey: file.fileKey,
                        type: WorkFileType.Completion,
                      }),
                    ) as Array<{
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

    if (work.status !== WorkStatus.Pending) {
      throw new WorkUpdateFailedException();
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

  async confirmArrival(user: User, id: number): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        status: true,
        startedAt: true,
        arrivalConfirmedAt: true,
      },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (work.requesterId !== user.id && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    if (work.status !== WorkStatus.InProgress || !work.startedAt || work.arrivalConfirmedAt) {
      throw new WorkUpdateFailedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        arrivalConfirmedAt: new Date(),
      },
    });

    return this.findById(user, id);
  }

  async finish(user: User, id: number, payload: FinishWorkDto): Promise<ResponseWorkDto> {
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

    if (work.status !== WorkStatus.InProgress) {
      throw new WorkUpdateFailedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        status: WorkStatus.Finished,
        completionDescription: payload.completionDescription.trim(),
        serviceDate: payload.serviceDate ? new Date(payload.serviceDate) : undefined,
        warrantyExpiresAt:
          payload.warrantyExpiresAt !== undefined
            ? payload.warrantyExpiresAt
              ? new Date(payload.warrantyExpiresAt)
              : null
            : undefined,
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

  async requestWarranty(
    user: User,
    id: number,
    payload: RequestWorkWarrantyDto,
  ): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        status: true,
        warrantyExpiresAt: true,
        warrantyRequestStatus: true,
      },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (work.requesterId !== user.id && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    if (
      work.status !== WorkStatus.Finished ||
      !work.warrantyExpiresAt ||
      work.warrantyExpiresAt.getTime() < Date.now() ||
      work.warrantyRequestStatus === WarrantyRequestStatus.Pending
    ) {
      throw new WorkUpdateFailedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        warrantyRequestedAt: new Date(),
        warrantyRequestDescription: payload.description.trim(),
        warrantyRequestStatus: WarrantyRequestStatus.Pending,
        warrantyResponseDescription: null,
        warrantyRespondedAt: null,
        files: payload.files?.length
          ? {
              deleteMany: { type: WorkFileType.WarrantyRequest },
              create: payload.files.map((file) => ({
                fileName: file.fileName,
                fileUrl: file.fileUrl,
                fileKey: file.fileKey,
                type: WorkFileType.WarrantyRequest,
              })),
            }
          : undefined,
      } as Prisma.WorkUncheckedUpdateInput,
    });

    return this.findById(user, id);
  }

  async respondWarranty(
    user: User,
    id: number,
    payload: RespondWorkWarrantyDto,
  ): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        providerId: true,
        warrantyRequestStatus: true,
      },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (work.providerId !== user.id && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    if (
      work.warrantyRequestStatus !== WarrantyRequestStatus.Pending ||
      (payload.status !== WarrantyRequestStatus.Approved &&
        payload.status !== WarrantyRequestStatus.Rejected)
    ) {
      throw new WorkUpdateFailedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        warrantyRequestStatus: payload.status,
        warrantyResponseDescription:
          payload.description !== undefined
            ? payload.description
              ? payload.description.trim()
              : null
            : null,
        warrantyRespondedAt: new Date(),
      } as Prisma.WorkUncheckedUpdateInput,
    });

    return this.findById(user, id);
  }

  async requestExtra(
    user: User,
    id: number,
    payload: RequestWorkExtraDto,
  ): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        providerId: true,
        status: true,
        extraRequestStatus: true,
      },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (work.providerId !== user.id && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    if (
      work.status === WorkStatus.Cancelled ||
      work.extraRequestStatus === ExtraRequestStatus.Pending
    ) {
      throw new WorkUpdateFailedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        extraRequestValue: parsePriceDecimal(payload.value),
        extraRequestDescription: payload.description.trim(),
        extraRequestStatus: ExtraRequestStatus.Pending,
        extraRequestedAt: new Date(),
        extraRespondedAt: null,
      },
    });

    return this.findById(user, id);
  }

  async respondExtra(
    user: User,
    id: number,
    payload: RespondWorkExtraDto,
  ): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        totalValue: true,
        serviceValue: true,
        extraRequestValue: true,
        extraRequestStatus: true,
      },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (work.requesterId !== user.id && !isAdmin) {
      throw new WorkAccessDeniedException();
    }

    if (
      work.extraRequestStatus !== ExtraRequestStatus.Pending ||
      !work.extraRequestValue ||
      (payload.status !== ExtraRequestStatus.Approved &&
        payload.status !== ExtraRequestStatus.Rejected)
    ) {
      throw new WorkUpdateFailedException();
    }

    await this.prisma.work.update({
      where: { id },
      data: {
        totalValue:
          payload.status === ExtraRequestStatus.Approved
            ? new Prisma.Decimal(work.totalValue || work.serviceValue || 0).plus(
                work.extraRequestValue,
              )
            : undefined,
        extraRequestStatus: payload.status,
        extraRespondedAt: new Date(),
      },
    });

    return this.findById(user, id);
  }

  async cancel(user: User, id: number, payload: CancelWorkDto): Promise<ResponseWorkDto> {
    const work = await this.prisma.work.findUnique({
      where: { id },
      select: { id: true, requesterId: true, providerId: true, status: true },
    });

    if (!work) {
      throw new WorkNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const canCancel = work.requesterId === user.id || work.providerId === user.id || isAdmin;

    if (!canCancel) {
      throw new WorkAccessDeniedException();
    }

    if (work.status === WorkStatus.Finished || work.status === WorkStatus.Cancelled) {
      throw new WorkUpdateFailedException();
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
