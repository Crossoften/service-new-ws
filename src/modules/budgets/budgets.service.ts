import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { ChatContextType, ExtraRequestStatus, Prisma, Role, User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { CreateWorkResponseDto } from '../works/dto/create-work-response.dto';
import { WorkFileTypeEnum } from '../works/enums/work-file-type.enum';
import { WorkStatusEnum } from '../works/enums/work-status.enum';
import { CreateBudgetResponseDto } from './dto/create-budget-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { QueryBudgetDto } from './dto/query-budget.dto';
import { RequestBudgetExtraDto } from './dto/request-budget-extra.dto';
import { RequestBudgetInformationDto } from './dto/request-budget-information.dto';
import { RespondBudgetExtraDto } from './dto/respond-budget-extra.dto';
import { ResponseFindAllBudgetDto } from './dto/response-find-all-budget.dto';
import { ResponseBudgetDto } from './dto/response-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetFileTypeEnum } from './enums/budget-file-type.enum';
import { BudgetScopeEnum } from './enums/budget-scope.enum';
import { BudgetStatusEnum } from './enums/budget-status.enum';
import { BudgetTimeUnitEnum } from './enums/budget-time-unit.enum';
import { BudgetAccessDeniedException } from './exceptions/budget-access-denied.exception';
import { BudgetAlreadyApprovedException } from './exceptions/budget-already-approved.exception';
import { BudgetApprovalNotAllowedException } from './exceptions/budget-approval-not-allowed.exception';
import { BudgetCreateFailedException } from './exceptions/budget-create-failed.exception';
import { BudgetNotFoundException } from './exceptions/budget-not-found.exception';
import { BudgetNotRespondedException } from './exceptions/budget-not-responded.exception';
import { BudgetProviderReplyNotAllowedException } from './exceptions/budget-provider-reply-not-allowed.exception';
import { BudgetUpdateFailedException } from './exceptions/budget-update-failed.exception';
import { ServiceNotFoundException } from '../services/exceptions/service-not-found.exception';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly budgetSelect = Prisma.validator<Prisma.BudgetSelect>()({
    id: true,
    description: true,
    status: true,
    responseDescription: true,
    responseValue: true,
    extraRequestValue: true,
    extraRequestDescription: true,
    extraRequestStatus: true,
    extraRequestedAt: true,
    extraRespondedAt: true,
    responseTimeQuantity: true,
    responseTimeUnit: true,
    serviceId: true,
    requesterId: true,
    providerId: true,
    createdAt: true,
    updatedAt: true,
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
    informationRequests: {
      select: {
        id: true,
        message: true,
        createdAt: true,
        updatedAt: true,
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
      },
      orderBy: { createdAt: 'desc' },
    },
  });

  private readonly budgetListSelect = Prisma.validator<Prisma.BudgetSelect>()({
    id: true,
    description: true,
    status: true,
    responseValue: true,
    extraRequestStatus: true,
    responseTimeQuantity: true,
    responseTimeUnit: true,
    createdAt: true,
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

  async create(user: User, payload: CreateBudgetDto): Promise<CreateBudgetResponseDto> {
    const service = await this.prisma.service.findUnique({
      where: { id: payload.serviceId },
      select: { id: true, userId: true, isActive: true },
    });

    if (!service || !service.isActive) {
      throw new ServiceNotFoundException();
    }

    try {
      const budget = await this.prisma.budget.create({
        data: {
          description: payload.description ? payload.description.trim() : null,
          serviceId: service.id,
          requesterId: user.id,
          providerId: service.userId,
          files:
            payload.files && payload.files.length > 0
              ? {
                  create: payload.files.map((file) => ({
                    fileName: file.fileName,
                    fileUrl: file.fileUrl,
                    fileKey: file.fileKey,
                    type: BudgetFileTypeEnum.Request,
                  })),
                }
              : undefined,
        },
        select: this.budgetSelect,
      });

      return {
        message: 'Orçamento cadastrado com sucesso.',
        budget: {
          id: budget.id,
          description: budget.description,
          status: budget.status as BudgetStatusEnum,
          responseDescription: budget.responseDescription,
          responseValue: budget.responseValue ? budget.responseValue.toFixed(2) : undefined,
          extraRequestValue: budget.extraRequestValue
            ? budget.extraRequestValue.toFixed(2)
            : undefined,
          extraRequestDescription: budget.extraRequestDescription || undefined,
          extraRequestStatus: budget.extraRequestStatus || undefined,
          extraRequestedAt: budget.extraRequestedAt || undefined,
          extraRespondedAt: budget.extraRespondedAt || undefined,
          responseTimeQuantity: budget.responseTimeQuantity,
          responseTimeUnit: budget.responseTimeUnit as BudgetTimeUnitEnum,
          serviceId: budget.serviceId,
          service: budget.service,
          requesterId: budget.requesterId,
          requester: budget.requester,
          providerId: budget.providerId,
          provider: budget.provider,
          files: budget.files.map((file) => ({
            id: file.id,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileKey: file.fileKey,
            type: file.type as BudgetFileTypeEnum,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          })),
          informationRequests: budget.informationRequests.map((request) => ({
            id: request.id,
            message: request.message,
            files: request.files.map((file) => ({
              id: file.id,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileKey: file.fileKey,
              type: file.type as BudgetFileTypeEnum,
              createdAt: file.createdAt,
              updatedAt: file.updatedAt,
            })),
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
          })),
          createdAt: budget.createdAt,
          updatedAt: budget.updatedAt,
        },
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new BudgetCreateFailedException();
      }

      throw error;
    }
  }

  async findAll(user: User, query: QueryBudgetDto): Promise<ResponseFindAllBudgetDto> {
    const take = query.take ?? 10;
    const page = query.skip ?? 1;
    const search = query.search ? query.search.trim() : undefined;
    const scope = query.scope || BudgetScopeEnum.Received;

    const where: Prisma.BudgetWhereInput = {
      status: query.status,
      serviceId: query.serviceId,
      requesterId: scope === BudgetScopeEnum.Requested ? user.id : undefined,
      providerId: scope === BudgetScopeEnum.Received ? user.id : undefined,
      OR: search
        ? [
            { requester: { name: { contains: search } } },
            { provider: { name: { contains: search } } },
            { service: { name: { contains: search } } },
          ]
        : undefined,
    };

    const [budgets, totalRecords] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        select: this.budgetListSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.budget.count({ where }),
    ]);

    return {
      budgets: budgets.map((budget) => ({
        id: budget.id,
        description: budget.description,
        status: budget.status as BudgetStatusEnum,
        responseValue: budget.responseValue ? budget.responseValue.toFixed(2) : undefined,
        extraRequestStatus: budget.extraRequestStatus || undefined,
        responseTimeQuantity: budget.responseTimeQuantity,
        responseTimeUnit: budget.responseTimeUnit as BudgetTimeUnitEnum,
        service: budget.service,
        requester: {
          id: budget.requester.id,
          name: budget.requester.name,
          fileUrl: budget.requester.fileUrl,
        },
        provider: {
          id: budget.provider.id,
          name: budget.provider.name,
          fileUrl: budget.provider.fileUrl,
        },
        createdAt: budget.createdAt,
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findById(user: User, id: number): Promise<ResponseBudgetDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: this.budgetSelect,
    });

    if (!budget) throw new BudgetNotFoundException();

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const canAccess = budget.requesterId === user.id || budget.providerId === user.id || isAdmin;

    if (!canAccess) {
      throw new BudgetAccessDeniedException();
    }

    return {
      id: budget.id,
      description: budget.description,
      status: budget.status as BudgetStatusEnum,
      responseDescription: budget.responseDescription,
      responseValue: budget.responseValue ? budget.responseValue.toFixed(2) : undefined,
      extraRequestValue: budget.extraRequestValue ? budget.extraRequestValue.toFixed(2) : undefined,
      extraRequestDescription: budget.extraRequestDescription || undefined,
      extraRequestStatus: budget.extraRequestStatus || undefined,
      extraRequestedAt: budget.extraRequestedAt || undefined,
      extraRespondedAt: budget.extraRespondedAt || undefined,
      responseTimeQuantity: budget.responseTimeQuantity,
      responseTimeUnit: budget.responseTimeUnit as BudgetTimeUnitEnum,
      serviceId: budget.serviceId,
      service: budget.service,
      requesterId: budget.requesterId,
      requester: budget.requester,
      providerId: budget.providerId,
      provider: budget.provider,
      files: budget.files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileKey: file.fileKey,
        type: file.type as BudgetFileTypeEnum,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })),
      informationRequests: budget.informationRequests.map((request) => ({
        id: request.id,
        message: request.message,
        files: request.files.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileKey: file.fileKey,
          type: file.type as BudgetFileTypeEnum,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        })),
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      })),
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }

  async update(user: User, id: number, payload: UpdateBudgetDto): Promise<ResponseBudgetDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: { id: true, requesterId: true, providerId: true, status: true },
    });

    if (!budget) throw new BudgetNotFoundException();

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isRequester = budget.requesterId === user.id;
    const isProvider = budget.providerId === user.id;
    const isUpdatingResponse =
      payload.responseDescription !== undefined ||
      payload.responseValue !== undefined ||
      payload.responseTimeQuantity !== undefined ||
      payload.responseTimeUnit !== undefined;
    const isUpdatingRequest =
      payload.description !== undefined ||
      payload.serviceId !== undefined ||
      payload.files !== undefined;

    if (!isRequester && !isProvider && !isAdmin) {
      throw new BudgetAccessDeniedException();
    }

    if (!isProvider && !isAdmin && isUpdatingResponse) {
      throw new BudgetProviderReplyNotAllowedException();
    }

    if (!isRequester && !isAdmin && isUpdatingRequest) {
      throw new BudgetAccessDeniedException();
    }

    if (payload.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: payload.serviceId },
        select: { id: true, userId: true, isActive: true },
      });

      if (!service || !service.isActive) throw new ServiceNotFoundException();
    }

    try {
      await this.prisma.budget.update({
        where: { id },
        data: {
          description:
            payload.description !== undefined
              ? payload.description
                ? payload.description.trim()
                : null
              : undefined,
          serviceId: payload.serviceId,
          status:
            payload.status ??
            (isUpdatingResponse
              ? BudgetStatusEnum.Responded
              : isRequester &&
                  budget.status === BudgetStatusEnum.WaitingInformation &&
                  isUpdatingRequest
                ? BudgetStatusEnum.Pending
                : undefined),
          responseDescription:
            payload.responseDescription !== undefined
              ? payload.responseDescription
                ? payload.responseDescription.trim()
                : null
              : undefined,
          responseValue:
            payload.responseValue !== undefined
              ? new Prisma.Decimal(payload.responseValue)
              : undefined,
          responseTimeQuantity: payload.responseTimeQuantity,
          responseTimeUnit: payload.responseTimeUnit,
          files: payload.files
            ? {
                deleteMany: { type: BudgetFileTypeEnum.Request },
                create: payload.files.map((file) => ({
                  fileName: file.fileName,
                  fileUrl: file.fileUrl,
                  fileKey: file.fileKey,
                  type: BudgetFileTypeEnum.Request,
                })),
              }
            : undefined,
        },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new BudgetUpdateFailedException();
      }

      throw error;
    }

    return this.findById(user, id);
  }

  async requestMoreInformation(
    user: User,
    id: number,
    payload: RequestBudgetInformationDto,
  ): Promise<ResponseBudgetDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: { id: true, providerId: true },
    });

    if (!budget) throw new BudgetNotFoundException();

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (budget.providerId !== user.id && !isAdmin) {
      throw new BudgetAccessDeniedException();
    }

    await this.prisma.budgetInformation.create({
      data: {
        message: payload.message.trim(),
        budgetId: id,
        files:
          payload.files && payload.files.length > 0
            ? {
                create: payload.files.map((file) => ({
                  fileName: file.fileName,
                  fileUrl: file.fileUrl,
                  fileKey: file.fileKey,
                  type: BudgetFileTypeEnum.InformationRequest,
                  budgetId: id,
                })),
              }
            : undefined,
      },
    });

    await this.prisma.budget.update({
      where: { id },
      data: { status: BudgetStatusEnum.WaitingInformation },
    });

    return this.findById(user, id);
  }

  async requestExtra(
    user: User,
    id: number,
    payload: RequestBudgetExtraDto,
  ): Promise<ResponseBudgetDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: {
        id: true,
        providerId: true,
        status: true,
        extraRequestStatus: true,
      },
    });

    if (!budget) throw new BudgetNotFoundException();

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (budget.providerId !== user.id && !isAdmin) {
      throw new BudgetAccessDeniedException();
    }

    if (
      budget.status === BudgetStatusEnum.Cancelled ||
      budget.extraRequestStatus === ExtraRequestStatus.Pending
    ) {
      throw new BudgetUpdateFailedException();
    }

    await this.prisma.budget.update({
      where: { id },
      data: {
        extraRequestValue: new Prisma.Decimal(payload.value),
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
    payload: RespondBudgetExtraDto,
  ): Promise<ResponseBudgetDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        responseValue: true,
        extraRequestValue: true,
        extraRequestStatus: true,
      },
    });

    if (!budget) throw new BudgetNotFoundException();

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (budget.requesterId !== user.id && !isAdmin) {
      throw new BudgetAccessDeniedException();
    }

    if (
      budget.extraRequestStatus !== ExtraRequestStatus.Pending ||
      !budget.extraRequestValue ||
      (payload.status !== ExtraRequestStatus.Approved &&
        payload.status !== ExtraRequestStatus.Rejected)
    ) {
      throw new BudgetUpdateFailedException();
    }

    await this.prisma.budget.update({
      where: { id },
      data: {
        responseValue:
          payload.status === ExtraRequestStatus.Approved
            ? new Prisma.Decimal(budget.responseValue || 0).plus(budget.extraRequestValue)
            : undefined,
        extraRequestStatus: payload.status,
        extraRespondedAt: new Date(),
      },
    });

    return this.findById(user, id);
  }

  async approve(user: User, id: number): Promise<CreateWorkResponseDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        description: true,
        responseValue: true,
        serviceId: true,
        requesterId: true,
        providerId: true,
        files: {
          select: {
            fileName: true,
            fileUrl: true,
            fileKey: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        work: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!budget) {
      throw new BudgetNotFoundException();
    }

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;

    if (budget.requesterId !== user.id && !isAdmin) {
      throw new BudgetApprovalNotAllowedException();
    }

    if (budget.status !== BudgetStatusEnum.Responded) {
      throw new BudgetNotRespondedException();
    }

    if (budget.work) {
      throw new BudgetAlreadyApprovedException();
    }

    const work = await this.prisma.$transaction(async (tx) => {
      const createdWork = await tx.work.create({
        data: {
          status: WorkStatusEnum.Pending,
          details: budget.description,
          serviceValue: budget.responseValue,
          totalValue: budget.responseValue,
          budgetId: budget.id,
          serviceId: budget.serviceId,
          requesterId: budget.requesterId,
          providerId: budget.providerId,
          files: budget.files.length
            ? {
                create: budget.files.map((file) => ({
                  fileName: file.fileName,
                  fileUrl: file.fileUrl,
                  fileKey: file.fileKey,
                  type: WorkFileTypeEnum.Requester,
                })),
              }
            : undefined,
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
                lastReadAt: new Date(),
              },
              {
                userId: budget.providerId,
              },
            ],
          },
        },
      });

      return createdWork;
    });
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: {
        contextType_referenceId: {
          contextType: ChatContextType.Work,
          referenceId: work.id,
        },
      },
      select: { id: true },
    });
    const chat = chatRoom ? { id: chatRoom.id } : undefined;

    return {
      message: 'Orçamento aprovado com sucesso.',
      work: {
        id: work.id,
        status: work.status as WorkStatusEnum,
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
        isUnderWarranty:
          !!work.warrantyExpiresAt &&
          work.status === WorkStatusEnum.Finished &&
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
          type: file.type as WorkFileTypeEnum,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        })),
        createdAt: work.createdAt,
        updatedAt: work.updatedAt,
        chat,
      },
    };
  }

  async delete(user: User, id: number): Promise<ImessageEntity> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: { id: true, requesterId: true, providerId: true },
    });

    if (!budget) throw new BudgetNotFoundException();

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const canDelete = budget.requesterId === user.id || budget.providerId === user.id || isAdmin;

    if (!canDelete) {
      throw new BudgetAccessDeniedException();
    }

    await this.prisma.budget.delete({ where: { id } });

    return { message: 'Orçamento deletado com sucesso.' };
  }
}
