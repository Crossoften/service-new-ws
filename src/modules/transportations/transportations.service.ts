import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import capitalizeFirstLetter from '@utils/capitalizeFirstLetter';
import { CreateTransportationResponseDto } from './dto/create-transportation-response.dto';
import { CreateTransportationReviewResponseDto } from './dto/create-transportation-review-response.dto';
import { CreateTransportationReviewDto } from './dto/create-transportation-review.dto';
import { CreateTransportationDto } from './dto/create-transportation.dto';
import { QueryTransportationDto } from './dto/query-transportation.dto';
import { ResponseFindAllTransportationDto } from './dto/response-find-all-transportation.dto';
import { ResponseTransportationCategoryDto } from './dto/response-transportation-category.dto';
import { ResponseTransportationDto } from './dto/response-transportation.dto';
import { UpdateTransportationDto } from './dto/update-transportation.dto';
import { TransportationAccessDeniedException } from './exceptions/transportation-access-denied.exception';
import { TransportationCategoryNotFoundException } from './exceptions/transportation-category-not-found.exception';
import { TransportationNotFoundException } from './exceptions/transportation-not-found.exception';
import { TransportationPersistenceException } from './exceptions/transportation-persistence.exception';
import { TransportationSelfReviewNotAllowedException } from './exceptions/transportation-self-review-not-allowed.exception';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { ReviewTypeEnum } from 'src/modules/services/enums/service-review-type.enum';

@Injectable()
export class TransportationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGuard: SubscriptionGuardService,
  ) {}

  private readonly transportationSelect = Prisma.validator<Prisma.TransportationSelect>()({
    id: true,
    name: true,
    model: true,
    mileageKm: true,
    capacity: true,
    year: true,
    price: true,
    description: true,
    imageUrl: true,
    imageKey: true,
    isActive: true,
    categoryId: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
        iconUrl: true,
        iconKey: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    },
  });

  private readonly transportationListSelect = Prisma.validator<Prisma.TransportationSelect>()({
    id: true,
    name: true,
    model: true,
    mileageKm: true,
    capacity: true,
    year: true,
    price: true,
    description: true,
    imageUrl: true,
    isActive: true,
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
        iconUrl: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    },
  });

  async create(
    user: User,
    payload: CreateTransportationDto,
  ): Promise<CreateTransportationResponseDto> {
    await this.subscriptionGuard.assertActiveSubscription(user);

    const category = await this.prisma.transportationCategory.findFirst({
      where: { id: payload.categoryId, isActive: true },
    });
    if (!category) {
      throw new TransportationCategoryNotFoundException();
    }

    try {
      const transportation = await this.prisma.transportation.create({
        data: {
          name: capitalizeFirstLetter(payload.name.trim()),
          model: payload.model ? payload.model.trim() : null,
          mileageKm: payload.mileageKm ?? null,
          capacity: payload.capacity ?? null,
          year: payload.year ?? null,
          price: new Prisma.Decimal(payload.price),
          description: payload.description ? payload.description.trim() : null,
          imageUrl: payload.imageUrl || null,
          imageKey: payload.imageKey || null,
          isActive: payload.isActive ?? true,
          categoryId: payload.categoryId,
          userId: user.id,
        },
        select: this.transportationSelect,
      });

      return {
        message: 'Transporte cadastrado com sucesso.',
        transportation: {
          id: transportation.id,
          name: transportation.name,
          model: transportation.model || undefined,
          mileageKm: transportation.mileageKm || undefined,
          capacity: transportation.capacity || undefined,
          year: transportation.year || undefined,
          price: transportation.price.toFixed(2),
          description: transportation.description || undefined,
          imageUrl: transportation.imageUrl || undefined,
          imageKey: transportation.imageKey || undefined,
          isActive: transportation.isActive,
          categoryId: transportation.categoryId,
          category: {
            id: transportation.category.id,
            name: transportation.category.name,
            slug: transportation.category.slug,
            iconUrl: transportation.category.iconUrl || undefined,
            iconKey: transportation.category.iconKey || undefined,
            isActive: transportation.category.isActive,
            sortOrder: transportation.category.sortOrder,
            createdAt: transportation.category.createdAt,
            updatedAt: transportation.category.updatedAt,
          },
          userId: transportation.userId,
          user: {
            id: transportation.user.id,
            name: transportation.user.name,
            email: transportation.user.email,
            phone: transportation.user.phone || undefined,
          },
          positiveReviews: 0,
          negativeReviews: 0,
          createdAt: transportation.createdAt,
          updatedAt: transportation.updatedAt,
        },
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new TransportationPersistenceException();
      }

      throw error;
    }
  }

  async findAllCategories(): Promise<ResponseTransportationCategoryDto[]> {
    const categories = await this.prisma.transportationCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl || undefined,
      iconKey: category.iconKey || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  async findAll(query: QueryTransportationDto): Promise<ResponseFindAllTransportationDto> {
    const take = query.take ?? 10;
    const page = query.skip ?? 1;
    const search = query.search?.trim() || query.name?.trim() || undefined;
    const isActive = query.isActive ?? true;

    const where: Prisma.TransportationWhereInput = {
      categoryId: query.categoryId,
      userId: query.userId,
      isActive,
      OR: search
        ? [
            { name: { contains: search } },
            { model: { contains: search } },
            { category: { name: { contains: search } } },
            { user: { name: { contains: search } } },
          ]
        : undefined,
    };

    const [transportations, totalRecords] = await Promise.all([
      this.prisma.transportation.findMany({
        where,
        select: this.transportationListSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.transportation.count({ where }),
    ]);
    const transportationIds = transportations.map((transportation) => transportation.id);
    const reviewCounts =
      transportationIds.length > 0
        ? await this.prisma.review.findMany({
            where: {
              transportationId: { in: transportationIds },
            },
            select: {
              transportationId: true,
              type: true,
            },
          })
        : [];

    return {
      transportations: transportations.map((transportation) => ({
        id: transportation.id,
        name: transportation.name,
        model: transportation.model || undefined,
        mileageKm: transportation.mileageKm || undefined,
        capacity: transportation.capacity || undefined,
        year: transportation.year || undefined,
        price: transportation.price.toFixed(2),
        description: transportation.description || undefined,
        imageUrl: transportation.imageUrl || undefined,
        isActive: transportation.isActive,
        category: {
          id: transportation.category.id,
          name: transportation.category.name,
          slug: transportation.category.slug,
          iconUrl: transportation.category.iconUrl || undefined,
        },
        user: {
          id: transportation.user.id,
          name: transportation.user.name,
          phone: transportation.user.phone || undefined,
        },
        positiveReviews: reviewCounts
          .filter(
            (review) =>
              review.transportationId === transportation.id &&
              review.type === ReviewTypeEnum.Positive,
          )
          .reduce((total) => total + 1, 0),
        negativeReviews: reviewCounts
          .filter(
            (review) =>
              review.transportationId === transportation.id &&
              review.type === ReviewTypeEnum.Negative,
          )
          .reduce((total) => total + 1, 0),
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findMyTransportations(
    user: User,
    query: QueryTransportationDto,
  ): Promise<ResponseFindAllTransportationDto> {
    const take = query.take ?? 10;
    const page = query.skip ?? 1;
    const search = query.search?.trim() || query.name?.trim() || undefined;

    const where: Prisma.TransportationWhereInput = {
      categoryId: query.categoryId,
      userId: user.id,
      isActive: query.isActive,
      OR: search
        ? [
            { name: { contains: search } },
            { model: { contains: search } },
            { category: { name: { contains: search } } },
            { user: { name: { contains: search } } },
          ]
        : undefined,
    };

    const [transportations, totalRecords] = await Promise.all([
      this.prisma.transportation.findMany({
        where,
        select: this.transportationListSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.transportation.count({ where }),
    ]);
    const transportationIds = transportations.map((transportation) => transportation.id);
    const reviewCounts =
      transportationIds.length > 0
        ? await this.prisma.review.findMany({
            where: {
              transportationId: { in: transportationIds },
            },
            select: {
              transportationId: true,
              type: true,
            },
          })
        : [];

    return {
      transportations: transportations.map((transportation) => ({
        id: transportation.id,
        name: transportation.name,
        model: transportation.model || undefined,
        mileageKm: transportation.mileageKm || undefined,
        capacity: transportation.capacity || undefined,
        year: transportation.year || undefined,
        price: transportation.price.toFixed(2),
        description: transportation.description || undefined,
        imageUrl: transportation.imageUrl || undefined,
        isActive: transportation.isActive,
        category: {
          id: transportation.category.id,
          name: transportation.category.name,
          slug: transportation.category.slug,
          iconUrl: transportation.category.iconUrl || undefined,
        },
        user: {
          id: transportation.user.id,
          name: transportation.user.name,
          phone: transportation.user.phone || undefined,
        },
        positiveReviews: reviewCounts
          .filter(
            (review) =>
              review.transportationId === transportation.id &&
              review.type === ReviewTypeEnum.Positive,
          )
          .reduce((total) => total + 1, 0),
        negativeReviews: reviewCounts
          .filter(
            (review) =>
              review.transportationId === transportation.id &&
              review.type === ReviewTypeEnum.Negative,
          )
          .reduce((total) => total + 1, 0),
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseTransportationDto> {
    const [transportation, reviewCounts] = await Promise.all([
      this.prisma.transportation.findUnique({
        where: { id },
        select: this.transportationSelect,
      }),
      this.prisma.review.findMany({
        where: {
          transportationId: id,
        },
        select: {
          type: true,
        },
      }),
    ]);

    if (!transportation) {
      throw new TransportationNotFoundException();
    }

    return {
      id: transportation.id,
      name: transportation.name,
      model: transportation.model || undefined,
      mileageKm: transportation.mileageKm || undefined,
      capacity: transportation.capacity || undefined,
      year: transportation.year || undefined,
      price: transportation.price.toFixed(2),
      description: transportation.description || undefined,
      imageUrl: transportation.imageUrl || undefined,
      imageKey: transportation.imageKey || undefined,
      isActive: transportation.isActive,
      categoryId: transportation.categoryId,
      category: {
        id: transportation.category.id,
        name: transportation.category.name,
        slug: transportation.category.slug,
        iconUrl: transportation.category.iconUrl || undefined,
        iconKey: transportation.category.iconKey || undefined,
        isActive: transportation.category.isActive,
        sortOrder: transportation.category.sortOrder,
        createdAt: transportation.category.createdAt,
        updatedAt: transportation.category.updatedAt,
      },
      userId: transportation.userId,
      user: {
        id: transportation.user.id,
        name: transportation.user.name,
        email: transportation.user.email,
        phone: transportation.user.phone || undefined,
      },
      positiveReviews: reviewCounts
        .filter((review) => review.type === ReviewTypeEnum.Positive)
        .reduce((total) => total + 1, 0),
      negativeReviews: reviewCounts
        .filter((review) => review.type === ReviewTypeEnum.Negative)
        .reduce((total) => total + 1, 0),
      createdAt: transportation.createdAt,
      updatedAt: transportation.updatedAt,
    };
  }

  async findPublicById(id: number): Promise<ResponseTransportationDto> {
    const [transportation, reviewCounts] = await Promise.all([
      this.prisma.transportation.findFirst({
        where: { id, isActive: true },
        select: this.transportationSelect,
      }),
      this.prisma.review.findMany({
        where: {
          transportationId: id,
        },
        select: {
          type: true,
        },
      }),
    ]);

    if (!transportation) {
      throw new TransportationNotFoundException();
    }

    return {
      id: transportation.id,
      name: transportation.name,
      model: transportation.model || undefined,
      mileageKm: transportation.mileageKm || undefined,
      capacity: transportation.capacity || undefined,
      year: transportation.year || undefined,
      price: transportation.price.toFixed(2),
      description: transportation.description || undefined,
      imageUrl: transportation.imageUrl || undefined,
      imageKey: transportation.imageKey || undefined,
      isActive: transportation.isActive,
      categoryId: transportation.categoryId,
      category: {
        id: transportation.category.id,
        name: transportation.category.name,
        slug: transportation.category.slug,
        iconUrl: transportation.category.iconUrl || undefined,
        iconKey: transportation.category.iconKey || undefined,
        isActive: transportation.category.isActive,
        sortOrder: transportation.category.sortOrder,
        createdAt: transportation.category.createdAt,
        updatedAt: transportation.category.updatedAt,
      },
      userId: transportation.userId,
      user: {
        id: transportation.user.id,
        name: transportation.user.name,
        email: transportation.user.email,
        phone: transportation.user.phone || undefined,
      },
      positiveReviews: reviewCounts
        .filter((review) => review.type === ReviewTypeEnum.Positive)
        .reduce((total) => total + 1, 0),
      negativeReviews: reviewCounts
        .filter((review) => review.type === ReviewTypeEnum.Negative)
        .reduce((total) => total + 1, 0),
      createdAt: transportation.createdAt,
      updatedAt: transportation.updatedAt,
    };
  }

  async review(
    user: User,
    id: number,
    payload: CreateTransportationReviewDto,
  ): Promise<CreateTransportationReviewResponseDto> {
    const transportation = await this.prisma.transportation.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!transportation) {
      throw new TransportationNotFoundException();
    }

    if (transportation.userId === user.id) {
      throw new TransportationSelfReviewNotAllowedException();
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        transportationId: id,
        requesterId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (existingReview) {
      await this.prisma.review.update({
        where: { id: existingReview.id },
        data: {
          type: payload.type,
          comment: payload.comment ? payload.comment.trim() : null,
        },
      });
    } else {
      await this.prisma.review.create({
        data: {
          type: payload.type,
          comment: payload.comment ? payload.comment.trim() : null,
          transportationId: id,
          requesterId: user.id,
        },
      });
    }

    return {
      message: 'Avaliação do transporte registrada com sucesso.',
      transportation: await this.findPublicById(id),
    };
  }

  async update(
    user: User,
    id: number,
    payload: UpdateTransportationDto,
  ): Promise<ResponseTransportationDto> {
    const transportation = await this.findById(id);
    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isOwner = user.id === transportation.userId;

    if (!isAdmin && !isOwner) {
      throw new TransportationAccessDeniedException();
    }

    if (payload.categoryId) {
      const cat = await this.prisma.transportationCategory.findFirst({
        where: { id: payload.categoryId, isActive: true },
      });
      if (!cat) {
        throw new TransportationCategoryNotFoundException();
      }
    }

    try {
      await this.prisma.transportation.update({
        where: { id },
        data: {
          name: payload.name ? capitalizeFirstLetter(payload.name.trim()) : undefined,
          model:
            payload.model !== undefined ? (payload.model ? payload.model.trim() : null) : undefined,
          mileageKm: payload.mileageKm !== undefined ? payload.mileageKm ?? null : undefined,
          capacity: payload.capacity !== undefined ? payload.capacity ?? null : undefined,
          year: payload.year !== undefined ? payload.year ?? null : undefined,
          price: payload.price !== undefined ? new Prisma.Decimal(payload.price) : undefined,
          description:
            payload.description !== undefined
              ? payload.description
                ? payload.description.trim()
                : null
              : undefined,
          imageUrl: payload.imageUrl !== undefined ? payload.imageUrl || null : undefined,
          imageKey: payload.imageKey !== undefined ? payload.imageKey || null : undefined,
          isActive: payload.isActive,
          categoryId: payload.categoryId,
        },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new TransportationPersistenceException();
      }

      throw error;
    }

    return this.findById(id);
  }

  async delete(user: User, id: number): Promise<ImessageEntity> {
    const transportation = await this.findById(id);
    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isOwner = user.id === transportation.userId;

    if (!isAdmin && !isOwner) {
      throw new TransportationAccessDeniedException();
    }

    await this.prisma.transportation.delete({ where: { id } });

    return { message: 'Transporte deletado com sucesso.' };
  }
}
