import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { ChatContextType, JobApplicationStatusEnum, Prisma, User } from '@prisma/client';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobDto } from './dto/query-job.dto';
import { ApplyJobDto } from './dto/apply-job.dto';
import { RespondJobApplicationDto } from './dto/respond-job-application.dto';
import { QueryJobApplicationDto } from './dto/query-job-application.dto';
import {
  CreateJobResponseDto,
  ResponseFindAllJobDto,
  ResponseJobDto,
} from './dto/response-job.dto';
import {
  CreateJobApplicationResponseDto,
  ResponseFindAllJobApplicationDto,
  ResponseJobApplicationDto,
} from './dto/response-job-application.dto';
import { JobNotFoundException } from './exceptions/job-not-found.exception';
import { JobAccessDeniedException } from './exceptions/job-access-denied.exception';
import { JobInactiveException } from './exceptions/job-inactive.exception';
import { JobApplicationNotFoundException } from './exceptions/job-application-not-found.exception';
import { JobApplicationAlreadyExistsException } from './exceptions/job-application-already-exists.exception';
import { JobApplicationInvalidStatusException } from './exceptions/job-application-invalid-status.exception';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGuard: SubscriptionGuardService,
  ) {}

  private readonly jobSelect = Prisma.validator<Prisma.JobSelect>()({
    id: true,
    title: true,
    type: true,
    value: true,
    requirements: true,
    description: true,
    isActive: true,
    employerId: true,
    createdAt: true,
    updatedAt: true,
    employer: { select: { id: true, name: true, fileUrl: true } },
    _count: { select: { applications: true } },
  });

  private readonly applicationSelect = Prisma.validator<Prisma.JobApplicationSelect>()({
    id: true,
    status: true,
    message: true,
    jobId: true,
    applicantId: true,
    respondedAt: true,
    createdAt: true,
    updatedAt: true,
    job: { select: { id: true, title: true, employerId: true } },
    applicant: { select: { id: true, name: true, fileUrl: true } },
  });

  async create(user: User, payload: CreateJobDto): Promise<CreateJobResponseDto> {
    await this.subscriptionGuard.assertActiveSubscription(user);

    const job = await this.prisma.job.create({
      data: {
        title: payload.title,
        type: payload.type,
        value: payload.value !== undefined ? new Prisma.Decimal(payload.value) : null,
        requirements: payload.requirements?.trim() || null,
        description: payload.description?.trim() || null,
        employerId: user.id,
      },
      select: { id: true },
    });

    return {
      message: 'Vaga publicada com sucesso.',
      job: await this.findById(user, job.id),
    };
  }

  async findAll(user: User, query: QueryJobDto): Promise<ResponseFindAllJobDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const where: Prisma.JobWhereInput = {
      ...(query.scope === 'Mine' ? { employerId: user.id } : { isActive: true }),
      ...(query.type && { type: query.type }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [jobs, totalRecords] = await Promise.all([
      this.prisma.job.findMany({
        where,
        select: this.jobSelect,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      jobs: jobs.map((job) => this.toResponseDto(job)),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findById(user: User, id: number): Promise<ResponseJobDto> {
    const job = await this.prisma.job.findUnique({ where: { id }, select: this.jobSelect });
    if (!job) throw new JobNotFoundException();
    return this.toResponseDto(job);
  }

  async update(user: User, id: number, payload: UpdateJobDto): Promise<ResponseJobDto> {
    const job = await this.findRawJobById(id);
    if (job.employerId !== user.id) throw new JobAccessDeniedException();

    await this.prisma.job.update({
      where: { id },
      data: {
        title: payload.title,
        type: payload.type,
        value: payload.value !== undefined ? new Prisma.Decimal(payload.value) : undefined,
        requirements: payload.requirements?.trim(),
        description: payload.description?.trim(),
        isActive: payload.isActive,
      },
    });

    return this.findById(user, id);
  }

  async apply(
    user: User,
    id: number,
    payload: ApplyJobDto,
  ): Promise<CreateJobApplicationResponseDto> {
    const job = await this.findRawJobById(id);
    if (!job.isActive) throw new JobInactiveException();

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_applicantId: { jobId: id, applicantId: user.id } },
      select: { id: true },
    });
    if (existing) throw new JobApplicationAlreadyExistsException();

    const defaultMessage = `Candidatura para a vaga "${job.title}".`;

    const application = await this.prisma.$transaction(async (tx) => {
      const created = await tx.jobApplication.create({
        data: {
          status: JobApplicationStatusEnum.Applied,
          message: payload.message?.trim() || null,
          jobId: id,
          applicantId: user.id,
        },
        select: { id: true },
      });

      await tx.chatRoom.create({
        data: {
          contextType: ChatContextType.Job,
          referenceId: created.id,
          createdById: user.id,
          lastMessageAt: new Date(),
          participants: { create: [{ userId: user.id }, { userId: job.employerId }] },
          messages: {
            create: {
              senderId: user.id,
              message: payload.message?.trim() || defaultMessage,
            },
          },
        },
      });

      return created;
    });

    return {
      message: 'Candidatura enviada com sucesso.',
      application: await this.findApplicationById(user, application.id),
    };
  }

  async findMyApplications(
    user: User,
    query: QueryJobApplicationDto,
  ): Promise<ResponseFindAllJobApplicationDto> {
    return this.listApplications({ applicantId: user.id }, query);
  }

  async findJobApplications(
    user: User,
    jobId: number,
    query: QueryJobApplicationDto,
  ): Promise<ResponseFindAllJobApplicationDto> {
    const job = await this.findRawJobById(jobId);
    if (job.employerId !== user.id) throw new JobAccessDeniedException();

    return this.listApplications({ jobId }, query);
  }

  async findApplicationById(user: User, id: number): Promise<ResponseJobApplicationDto> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
      select: this.applicationSelect,
    });
    if (!application) throw new JobApplicationNotFoundException();
    if (application.applicantId !== user.id && application.job.employerId !== user.id) {
      throw new JobAccessDeniedException();
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { contextType_referenceId: { contextType: ChatContextType.Job, referenceId: id } },
      select: { id: true },
    });

    return this.toApplicationResponseDto(application, room?.id || 0);
  }

  async respondApplication(
    user: User,
    id: number,
    payload: RespondJobApplicationDto,
  ): Promise<ResponseJobApplicationDto> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
      select: { id: true, status: true, job: { select: { employerId: true } } },
    });
    if (!application) throw new JobApplicationNotFoundException();
    if (application.job.employerId !== user.id) throw new JobAccessDeniedException();
    if (application.status !== JobApplicationStatusEnum.Applied) {
      throw new JobApplicationInvalidStatusException();
    }

    await this.prisma.jobApplication.update({
      where: { id },
      data: { status: payload.status, respondedAt: new Date() },
    });

    return this.findApplicationById(user, id);
  }

  private async listApplications(
    baseWhere: Prisma.JobApplicationWhereInput,
    query: QueryJobApplicationDto,
  ): Promise<ResponseFindAllJobApplicationDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const where: Prisma.JobApplicationWhereInput = {
      ...baseWhere,
      ...(query.status && { status: query.status }),
    };

    const [applications, totalRecords] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        select: this.applicationSelect,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        contextType: ChatContextType.Job,
        referenceId: { in: applications.map((application) => application.id) },
      },
      select: { id: true, referenceId: true },
    });
    const roomMap = new Map(rooms.map((room) => [room.referenceId, room.id]));

    return {
      applications: applications.map((application) =>
        this.toApplicationResponseDto(application, roomMap.get(application.id) || 0),
      ),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  private async findRawJobById(id: number) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      select: { id: true, title: true, isActive: true, employerId: true },
    });
    if (!job) throw new JobNotFoundException();
    return job;
  }

  private toResponseDto(job: any): ResponseJobDto {
    return {
      id: job.id,
      title: job.title,
      type: job.type,
      value: job.value?.toFixed(2) ?? undefined,
      requirements: job.requirements ?? undefined,
      description: job.description ?? undefined,
      isActive: job.isActive,
      employer: {
        id: job.employer.id,
        name: job.employer.name,
        fileUrl: job.employer.fileUrl ?? undefined,
      },
      applicationsCount: job._count?.applications,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private toApplicationResponseDto(
    application: any,
    chatRoomId: number,
  ): ResponseJobApplicationDto {
    return {
      id: application.id,
      status: application.status,
      message: application.message ?? undefined,
      chatRoomId,
      job: { id: application.job.id, title: application.job.title },
      applicant: {
        id: application.applicant.id,
        name: application.applicant.name,
        fileUrl: application.applicant.fileUrl ?? undefined,
      },
      respondedAt: application.respondedAt ?? undefined,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
