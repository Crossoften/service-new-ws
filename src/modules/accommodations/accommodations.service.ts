import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import capitalizeFirstLetter from '@utils/capitalizeFirstLetter';
import { parseBooleanString } from '@utils/parseBooleanString';
import { parseOptionalBooleanString } from '@utils/parseOptionalBooleanString';
import { parsePositiveInt } from '@utils/parsePositiveInt';
import { parsePriceDecimal } from '@utils/parsePriceDecimal';
import { CreateAccommodationResponseDto } from './dto/create-accommodation-response.dto';
import { CreateAccommodationReviewResponseDto } from './dto/create-accommodation-review-response.dto';
import { CreateAccommodationReviewDto } from './dto/create-accommodation-review.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { QueryAccommodationDto } from './dto/query-accommodation.dto';
import { ResponseAccommodationCategoryDto } from './dto/response-accommodation-category.dto';
import { ResponseAccommodationDto } from './dto/response-accommodation.dto';
import { ResponseFindAllAccommodationDto } from './dto/response-find-all-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { AccommodationAccessDeniedException } from './exceptions/accommodation-access-denied.exception';
import { AccommodationCategoryNotFoundException } from './exceptions/accommodation-category-not-found.exception';
import { AccommodationNotFoundException } from './exceptions/accommodation-not-found.exception';
import { AccommodationPersistenceException } from './exceptions/accommodation-persistence.exception';
import { AccommodationSelfReviewNotAllowedException } from './exceptions/accommodation-self-review-not-allowed.exception';
import { ReviewType } from 'src/modules/services/enums/service-review-type.enum';

@Injectable()
export class AccommodationsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly accommodationSelect = Prisma.validator<Prisma.AccommodationSelect>()({
    id: true,
    name: true,
    addressId: true,
    roomsQuantity: true,
    price: true,
    description: true,
    imageUrl: true,
    imageKey: true,
    isActive: true,
    categoryId: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    address: {
      select: {
        street: true,
        neighborhood: true,
        city: true,
        state: true,
      },
    },
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

  private readonly accommodationListSelect = Prisma.validator<Prisma.AccommodationSelect>()({
    id: true,
    name: true,
    roomsQuantity: true,
    price: true,
    description: true,
    imageUrl: true,
    isActive: true,
    address: {
      select: {
        city: true,
        state: true,
      },
    },
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
    payload: CreateAccommodationDto,
  ): Promise<CreateAccommodationResponseDto> {
    const categoryId = parsePositiveInt(payload.categoryId, 'categoryId');
    const roomsQuantity = payload.roomsQuantity
      ? parsePositiveInt(payload.roomsQuantity, 'roomsQuantity')
      : null;
    const price = parsePriceDecimal(payload.price);
    const isActive = parseOptionalBooleanString(payload.isActive, 'isActive');

    await this.findCategoryById(categoryId);

    try {
      const accommodation = await this.prisma.accommodation.create({
        data: {
          name: capitalizeFirstLetter(payload.name.trim()),
          address: [payload.street, payload.neighborhood, payload.city, payload.state].some(
            (value) => value !== undefined && value.trim() !== '',
          )
            ? {
                create: {
                  street: payload.street ? payload.street.trim() : null,
                  neighborhood: payload.neighborhood ? payload.neighborhood.trim() : null,
                  city: payload.city ? payload.city.trim() : null,
                  state: payload.state ? payload.state.trim() : null,
                },
              }
            : undefined,
          roomsQuantity,
          price,
          description: payload.description ? payload.description.trim() : null,
          imageUrl: payload.imageUrl || null,
          imageKey: payload.imageKey || null,
          isActive: isActive ?? true,
          category: {
            connect: { id: categoryId },
          },
          user: {
            connect: { id: user.id },
          },
        },
        select: this.accommodationSelect,
      });

      return {
        message: 'Hospedagem cadastrada com sucesso.',
        accommodation: {
          id: accommodation.id,
          name: accommodation.name,
          street: accommodation.address?.street || undefined,
          neighborhood: accommodation.address?.neighborhood || undefined,
          city: accommodation.address?.city || undefined,
          state: accommodation.address?.state || undefined,
          roomsQuantity: accommodation.roomsQuantity || undefined,
          price: accommodation.price.toFixed(2),
          description: accommodation.description || undefined,
          imageUrl: accommodation.imageUrl || undefined,
          imageKey: accommodation.imageKey || undefined,
          isActive: accommodation.isActive,
          categoryId: accommodation.categoryId,
          category: {
            id: accommodation.category.id,
            name: accommodation.category.name,
            slug: accommodation.category.slug,
            iconUrl: accommodation.category.iconUrl || undefined,
            iconKey: accommodation.category.iconKey || undefined,
            isActive: accommodation.category.isActive,
            sortOrder: accommodation.category.sortOrder,
            createdAt: accommodation.category.createdAt,
            updatedAt: accommodation.category.updatedAt,
          },
          userId: accommodation.userId,
          user: {
            id: accommodation.user.id,
            name: accommodation.user.name,
            email: accommodation.user.email,
            phone: accommodation.user.phone || undefined,
          },
          positiveReviews: 0,
          negativeReviews: 0,
          createdAt: accommodation.createdAt,
          updatedAt: accommodation.updatedAt,
        },
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new AccommodationPersistenceException();
      }

      throw error;
    }
  }

  async findAllCategories(): Promise<ResponseAccommodationCategoryDto[]> {
    const categories = await this.prisma.accommodationCategory.findMany({
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

  async findAll(query: QueryAccommodationDto): Promise<ResponseFindAllAccommodationDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const name = query.name ? query.name.trim() : undefined;
    const city = query.city ? query.city.trim() : undefined;
    const state = query.state ? query.state.trim() : undefined;
    const categoryId = query.categoryId
      ? parsePositiveInt(query.categoryId, 'categoryId')
      : undefined;
    const userId = query.userId ? parsePositiveInt(query.userId, 'userId') : undefined;
    const isActive =
      query.isActive !== undefined ? parseBooleanString(query.isActive, 'isActive') : true;

    const where: Prisma.AccommodationWhereInput = {
      name: name ? { contains: name } : undefined,
      categoryId,
      userId,
      isActive,
    };

    if (city || state) {
      where.address = {
        is: {
          city: city ? { contains: city } : undefined,
          state: state ? { contains: state } : undefined,
        },
      };
    }

    const [accommodations, totalRecords] = await Promise.all([
      this.prisma.accommodation.findMany({
        where,
        select: this.accommodationListSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.accommodation.count({ where }),
    ]);
    const accommodationIds = accommodations.map((accommodation) => accommodation.id);
    const reviewCounts =
      accommodationIds.length > 0
        ? await this.prisma.review.findMany({
            where: {
              accommodationId: { in: accommodationIds },
            },
            select: {
              accommodationId: true,
              type: true,
            },
          })
        : [];

    return {
      accommodations: accommodations.map((accommodation) => ({
        id: accommodation.id,
        name: accommodation.name,
        city: accommodation.address?.city || undefined,
        state: accommodation.address?.state || undefined,
        roomsQuantity: accommodation.roomsQuantity || undefined,
        price: accommodation.price.toFixed(2),
        description: accommodation.description || undefined,
        imageUrl: accommodation.imageUrl || undefined,
        isActive: accommodation.isActive,
        category: {
          id: accommodation.category.id,
          name: accommodation.category.name,
          slug: accommodation.category.slug,
          iconUrl: accommodation.category.iconUrl || undefined,
        },
        user: {
          id: accommodation.user.id,
          name: accommodation.user.name,
          phone: accommodation.user.phone || undefined,
        },
        positiveReviews: reviewCounts
          .filter(
            (review) =>
              review.accommodationId === accommodation.id && review.type === ReviewType.Positive,
          )
          .reduce((total) => total + 1, 0),
        negativeReviews: reviewCounts
          .filter(
            (review) =>
              review.accommodationId === accommodation.id && review.type === ReviewType.Negative,
          )
          .reduce((total) => total + 1, 0),
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findMyAccommodations(
    user: User,
    query: QueryAccommodationDto,
  ): Promise<ResponseFindAllAccommodationDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const name = query.name ? query.name.trim() : undefined;
    const city = query.city ? query.city.trim() : undefined;
    const state = query.state ? query.state.trim() : undefined;
    const categoryId = query.categoryId
      ? parsePositiveInt(query.categoryId, 'categoryId')
      : undefined;
    const isActive =
      query.isActive !== undefined ? parseBooleanString(query.isActive, 'isActive') : undefined;

    const where: Prisma.AccommodationWhereInput = {
      name: name ? { contains: name } : undefined,
      categoryId,
      userId: user.id,
      isActive,
    };

    if (city || state) {
      where.address = {
        is: {
          city: city ? { contains: city } : undefined,
          state: state ? { contains: state } : undefined,
        },
      };
    }

    const [accommodations, totalRecords] = await Promise.all([
      this.prisma.accommodation.findMany({
        where,
        select: this.accommodationListSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.accommodation.count({ where }),
    ]);
    const accommodationIds = accommodations.map((accommodation) => accommodation.id);
    const reviewCounts =
      accommodationIds.length > 0
        ? await this.prisma.review.findMany({
            where: {
              accommodationId: { in: accommodationIds },
            },
            select: {
              accommodationId: true,
              type: true,
            },
          })
        : [];

    return {
      accommodations: accommodations.map((accommodation) => ({
        id: accommodation.id,
        name: accommodation.name,
        city: accommodation.address?.city || undefined,
        state: accommodation.address?.state || undefined,
        roomsQuantity: accommodation.roomsQuantity || undefined,
        price: accommodation.price.toFixed(2),
        description: accommodation.description || undefined,
        imageUrl: accommodation.imageUrl || undefined,
        isActive: accommodation.isActive,
        category: {
          id: accommodation.category.id,
          name: accommodation.category.name,
          slug: accommodation.category.slug,
          iconUrl: accommodation.category.iconUrl || undefined,
        },
        user: {
          id: accommodation.user.id,
          name: accommodation.user.name,
          phone: accommodation.user.phone || undefined,
        },
        positiveReviews: reviewCounts
          .filter(
            (review) =>
              review.accommodationId === accommodation.id && review.type === ReviewType.Positive,
          )
          .reduce((total) => total + 1, 0),
        negativeReviews: reviewCounts
          .filter(
            (review) =>
              review.accommodationId === accommodation.id && review.type === ReviewType.Negative,
          )
          .reduce((total) => total + 1, 0),
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseAccommodationDto> {
    const [accommodation, reviewCounts] = await Promise.all([
      this.prisma.accommodation.findUnique({
        where: { id },
        select: this.accommodationSelect,
      }),
      this.prisma.review.findMany({
        where: {
          accommodationId: id,
        },
        select: {
          type: true,
        },
      }),
    ]);

    if (!accommodation) {
      throw new AccommodationNotFoundException();
    }

    return {
      id: accommodation.id,
      name: accommodation.name,
      street: accommodation.address?.street || undefined,
      neighborhood: accommodation.address?.neighborhood || undefined,
      city: accommodation.address?.city || undefined,
      state: accommodation.address?.state || undefined,
      roomsQuantity: accommodation.roomsQuantity || undefined,
      price: accommodation.price.toFixed(2),
      description: accommodation.description || undefined,
      imageUrl: accommodation.imageUrl || undefined,
      imageKey: accommodation.imageKey || undefined,
      isActive: accommodation.isActive,
      categoryId: accommodation.categoryId,
      category: {
        id: accommodation.category.id,
        name: accommodation.category.name,
        slug: accommodation.category.slug,
        iconUrl: accommodation.category.iconUrl || undefined,
        iconKey: accommodation.category.iconKey || undefined,
        isActive: accommodation.category.isActive,
        sortOrder: accommodation.category.sortOrder,
        createdAt: accommodation.category.createdAt,
        updatedAt: accommodation.category.updatedAt,
      },
      userId: accommodation.userId,
      user: {
        id: accommodation.user.id,
        name: accommodation.user.name,
        email: accommodation.user.email,
        phone: accommodation.user.phone || undefined,
      },
      positiveReviews: reviewCounts
        .filter((review) => review.type === ReviewType.Positive)
        .reduce((total) => total + 1, 0),
      negativeReviews: reviewCounts
        .filter((review) => review.type === ReviewType.Negative)
        .reduce((total) => total + 1, 0),
      createdAt: accommodation.createdAt,
      updatedAt: accommodation.updatedAt,
    };
  }

  async findPublicById(id: number): Promise<ResponseAccommodationDto> {
    const [accommodation, reviewCounts] = await Promise.all([
      this.prisma.accommodation.findFirst({
        where: { id, isActive: true },
        select: this.accommodationSelect,
      }),
      this.prisma.review.findMany({
        where: {
          accommodationId: id,
        },
        select: {
          type: true,
        },
      }),
    ]);

    if (!accommodation) {
      throw new AccommodationNotFoundException();
    }

    return {
      id: accommodation.id,
      name: accommodation.name,
      street: accommodation.address?.street || undefined,
      neighborhood: accommodation.address?.neighborhood || undefined,
      city: accommodation.address?.city || undefined,
      state: accommodation.address?.state || undefined,
      roomsQuantity: accommodation.roomsQuantity || undefined,
      price: accommodation.price.toFixed(2),
      description: accommodation.description || undefined,
      imageUrl: accommodation.imageUrl || undefined,
      imageKey: accommodation.imageKey || undefined,
      isActive: accommodation.isActive,
      categoryId: accommodation.categoryId,
      category: {
        id: accommodation.category.id,
        name: accommodation.category.name,
        slug: accommodation.category.slug,
        iconUrl: accommodation.category.iconUrl || undefined,
        iconKey: accommodation.category.iconKey || undefined,
        isActive: accommodation.category.isActive,
        sortOrder: accommodation.category.sortOrder,
        createdAt: accommodation.category.createdAt,
        updatedAt: accommodation.category.updatedAt,
      },
      userId: accommodation.userId,
      user: {
        id: accommodation.user.id,
        name: accommodation.user.name,
        email: accommodation.user.email,
        phone: accommodation.user.phone || undefined,
      },
      positiveReviews: reviewCounts
        .filter((review) => review.type === ReviewType.Positive)
        .reduce((total) => total + 1, 0),
      negativeReviews: reviewCounts
        .filter((review) => review.type === ReviewType.Negative)
        .reduce((total) => total + 1, 0),
      createdAt: accommodation.createdAt,
      updatedAt: accommodation.updatedAt,
    };
  }

  async review(
    user: User,
    id: number,
    payload: CreateAccommodationReviewDto,
  ): Promise<CreateAccommodationReviewResponseDto> {
    const accommodation = await this.prisma.accommodation.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!accommodation) {
      throw new AccommodationNotFoundException();
    }

    if (accommodation.userId === user.id) {
      throw new AccommodationSelfReviewNotAllowedException();
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        accommodationId: id,
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
          accommodationId: id,
          requesterId: user.id,
        },
      });
    }

    return {
      message: 'Avaliação da hospedagem registrada com sucesso.',
      accommodation: await this.findPublicById(id),
    };
  }

  async update(
    user: User,
    id: number,
    payload: UpdateAccommodationDto,
  ): Promise<ResponseAccommodationDto> {
    const accommodation = await this.findAccommodationById(id);
    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isOwner = user.id === accommodation.userId;

    if (!isAdmin && !isOwner) {
      throw new AccommodationAccessDeniedException();
    }

    const categoryId = payload.categoryId
      ? parsePositiveInt(payload.categoryId, 'categoryId')
      : undefined;

    if (categoryId) {
      await this.findCategoryById(categoryId);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const hasAddressField =
          payload.street !== undefined ||
          payload.neighborhood !== undefined ||
          payload.city !== undefined ||
          payload.state !== undefined;

        if (hasAddressField) {
          const mappedAddress = {
            street: payload.street ? payload.street.trim() : null,
            neighborhood: payload.neighborhood ? payload.neighborhood.trim() : null,
            city: payload.city ? payload.city.trim() : null,
            state: payload.state ? payload.state.trim() : null,
          };
          const hasAddressValues = Object.values(mappedAddress).some((value) => value !== null);

          if (hasAddressValues) {
            if (accommodation.addressId) {
              await tx.address.update({
                where: { id: accommodation.addressId },
                data: mappedAddress,
              });
            } else {
              const address = await tx.address.create({
                data: mappedAddress,
                select: { id: true },
              });

              await tx.accommodation.update({
                where: { id },
                data: { addressId: address.id },
              });
            }
          } else if (accommodation.addressId) {
            await tx.accommodation.update({
              where: { id },
              data: { addressId: null },
            });

            await tx.address.delete({
              where: { id: accommodation.addressId },
            });
          }
        }

        await tx.accommodation.update({
          where: { id },
          data: {
            name: payload.name ? capitalizeFirstLetter(payload.name.trim()) : undefined,
            roomsQuantity:
              payload.roomsQuantity !== undefined
                ? payload.roomsQuantity
                  ? parsePositiveInt(payload.roomsQuantity, 'roomsQuantity')
                  : null
                : undefined,
            price: payload.price ? parsePriceDecimal(payload.price) : undefined,
            description:
              payload.description !== undefined
                ? payload.description
                  ? payload.description.trim()
                  : null
                : undefined,
            imageUrl: payload.imageUrl !== undefined ? payload.imageUrl || null : undefined,
            imageKey: payload.imageKey !== undefined ? payload.imageKey || null : undefined,
            isActive: parseOptionalBooleanString(payload.isActive, 'isActive'),
            categoryId,
          },
        });
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new AccommodationPersistenceException();
      }

      throw error;
    }

    return this.findById(id);
  }

  async delete(user: User, id: number): Promise<ImessageEntity> {
    const accommodation = await this.findAccommodationById(id);
    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isOwner = user.id === accommodation.userId;

    if (!isAdmin && !isOwner) {
      throw new AccommodationAccessDeniedException();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.accommodation.delete({ where: { id } });

      if (accommodation.addressId) {
        await tx.address.delete({ where: { id: accommodation.addressId } });
      }
    });

    return { message: 'Hospedagem deletada com sucesso.' };
  }

  private async findCategoryById(id: number) {
    const category = await this.prisma.accommodationCategory.findFirst({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new AccommodationCategoryNotFoundException();
    }

    return category;
  }

  private async findAccommodationById(id: number) {
    const accommodation = await this.prisma.accommodation.findUnique({
      where: { id },
      select: this.accommodationSelect,
    });

    if (!accommodation) {
      throw new AccommodationNotFoundException();
    }

    return accommodation;
  }
}
