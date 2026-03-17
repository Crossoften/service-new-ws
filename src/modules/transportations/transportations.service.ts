import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import capitalizeFirstLetter from '@utils/capitalizeFirstLetter';
import { parseBooleanString } from '@utils/parseBooleanString';
import { parseOptionalBooleanString } from '@utils/parseOptionalBooleanString';
import { parsePositiveInt } from '@utils/parsePositiveInt';
import { parsePriceDecimal } from '@utils/parsePriceDecimal';
import { CreateTransportationResponseDto } from './dto/create-transportation-response.dto';
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

@Injectable()
export class TransportationsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const categoryId = parsePositiveInt(payload.categoryId, 'categoryId');
    const price = parsePriceDecimal(payload.price);
    const isActive = parseOptionalBooleanString(payload.isActive, 'isActive');
    const mileageKm = payload.mileageKm ? parsePositiveInt(payload.mileageKm, 'mileageKm') : null;
    const capacity = payload.capacity ? parsePositiveInt(payload.capacity, 'capacity') : null;
    const year = payload.year ? parsePositiveInt(payload.year, 'year') : null;

    await this.findCategoryById(categoryId);

    try {
      const transportation = await this.prisma.transportation.create({
        data: {
          name: capitalizeFirstLetter(payload.name.trim()),
          model: payload.model ? payload.model.trim() : null,
          mileageKm,
          capacity,
          year,
          price,
          description: payload.description ? payload.description.trim() : null,
          imageUrl: payload.imageUrl || null,
          imageKey: payload.imageKey || null,
          isActive: isActive ?? true,
          categoryId,
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
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const name = query.name ? query.name.trim() : undefined;
    const categoryId = query.categoryId
      ? parsePositiveInt(query.categoryId, 'categoryId')
      : undefined;
    const userId = query.userId ? parsePositiveInt(query.userId, 'userId') : undefined;
    const isActive =
      query.isActive !== undefined ? parseBooleanString(query.isActive, 'isActive') : true;

    const where: Prisma.TransportationWhereInput = {
      name: name ? { contains: name } : undefined,
      categoryId,
      userId,
      isActive,
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
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const name = query.name ? query.name.trim() : undefined;
    const categoryId = query.categoryId
      ? parsePositiveInt(query.categoryId, 'categoryId')
      : undefined;
    const isActive =
      query.isActive !== undefined ? parseBooleanString(query.isActive, 'isActive') : undefined;

    const where: Prisma.TransportationWhereInput = {
      name: name ? { contains: name } : undefined,
      categoryId,
      userId: user.id,
      isActive,
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
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseTransportationDto> {
    const transportation = await this.prisma.transportation.findUnique({
      where: { id },
      select: this.transportationSelect,
    });

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
      createdAt: transportation.createdAt,
      updatedAt: transportation.updatedAt,
    };
  }

  async findPublicById(id: number): Promise<ResponseTransportationDto> {
    const transportation = await this.prisma.transportation.findFirst({
      where: { id, isActive: true },
      select: this.transportationSelect,
    });

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
      createdAt: transportation.createdAt,
      updatedAt: transportation.updatedAt,
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

    const categoryId = payload.categoryId
      ? parsePositiveInt(payload.categoryId, 'categoryId')
      : undefined;

    if (categoryId) {
      await this.findCategoryById(categoryId);
    }

    try {
      await this.prisma.transportation.update({
        where: { id },
        data: {
          name: payload.name ? capitalizeFirstLetter(payload.name.trim()) : undefined,
          model:
            payload.model !== undefined ? (payload.model ? payload.model.trim() : null) : undefined,
          mileageKm:
            payload.mileageKm !== undefined
              ? payload.mileageKm
                ? parsePositiveInt(payload.mileageKm, 'mileageKm')
                : null
              : undefined,
          capacity:
            payload.capacity !== undefined
              ? payload.capacity
                ? parsePositiveInt(payload.capacity, 'capacity')
                : null
              : undefined,
          year:
            payload.year !== undefined
              ? payload.year
                ? parsePositiveInt(payload.year, 'year')
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

  private async findCategoryById(id: number) {
    const category = await this.prisma.transportationCategory.findFirst({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new TransportationCategoryNotFoundException();
    }

    return category;
  }
}
