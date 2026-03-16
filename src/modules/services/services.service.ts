import { PrismaService } from '@database/PrismaService';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import capitalizeFirstLetter from '@utils/capitalizeFirstLetter';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { parseBooleanString } from '@utils/parseBooleanString';
import { parseOptionalBooleanString } from '@utils/parseOptionalBooleanString';
import { parsePositiveInt } from '@utils/parsePositiveInt';
import { parsePriceDecimal } from '@utils/parsePriceDecimal';
import { CreateServiceResponseDto } from './dto/create-service-response.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { ResponseFindAllServiceDto } from './dto/response-find-all-service.dto';
import { ResponseServiceCategoryDto } from './dto/response-service-category.dto';
import { ResponseServiceDto } from './dto/response-service.dto';
import { ServiceType } from './enums/service-type.enum';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly serviceSelect = Prisma.validator<Prisma.ServiceSelect>()({
    id: true,
    name: true,
    type: true,
    registrationCode: true,
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

  async create(user: User, payload: CreateServiceDto): Promise<CreateServiceResponseDto> {
    const categoryId = parsePositiveInt(payload.categoryId, 'categoryId');
    const price = parsePriceDecimal(payload.price);
    const isActive = parseOptionalBooleanString(payload.isActive, 'isActive');

    await this.findCategoryById(categoryId);

    try {
      const service = await this.prisma.service.create({
        data: {
          name: capitalizeFirstLetter(payload.name.trim()),
          type: payload.type,
          registrationCode: payload.registrationCode ? payload.registrationCode.trim() : null,
          price,
          description: payload.description ? payload.description.trim() : null,
          imageUrl: payload.imageUrl || null,
          imageKey: payload.imageKey || null,
          isActive: isActive ?? true,
          categoryId,
          userId: user.id,
        },
        select: this.serviceSelect,
      });

      return {
        message: 'Serviço cadastrado com sucesso.',
        service: {
          id: service.id,
          name: service.name,
          type: service.type as ServiceType,
          registrationCode: service.registrationCode,
          price: service.price.toFixed(2),
          description: service.description,
          imageUrl: service.imageUrl,
          imageKey: service.imageKey,
          isActive: service.isActive,
          categoryId: service.categoryId,
          category: {
            id: service.category.id,
            name: service.category.name,
            slug: service.category.slug,
            iconUrl: service.category.iconUrl,
            iconKey: service.category.iconKey,
            isActive: service.category.isActive,
            sortOrder: service.category.sortOrder,
            createdAt: service.category.createdAt,
            updatedAt: service.category.updatedAt,
          },
          userId: service.userId,
          user: {
            id: service.user.id,
            name: service.user.name,
            email: service.user.email,
            phone: service.user.phone,
          },
          createdAt: service.createdAt,
          updatedAt: service.updatedAt,
        },
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new BadRequestException(
          'Não foi possível persistir o serviço com os dados informados.',
        );
      }

      throw error;
    }
  }

  async findAllCategories(): Promise<ResponseServiceCategoryDto[]> {
    const categories = await this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl,
      iconKey: category.iconKey,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  async findAll(query: QueryServiceDto): Promise<ResponseFindAllServiceDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const name = query.name ? query.name.trim() : undefined;
    const categoryId = query.categoryId
      ? parsePositiveInt(query.categoryId, 'categoryId')
      : undefined;
    const userId = query.userId ? parsePositiveInt(query.userId, 'userId') : undefined;
    const isActive =
      query.isActive !== undefined ? parseBooleanString(query.isActive, 'isActive') : true;

    const where: Prisma.ServiceWhereInput = {
      name: name ? { contains: name } : undefined,
      categoryId,
      type: query.type,
      userId,
      isActive,
    };

    const [services, totalRecords] = await Promise.all([
      this.prisma.service.findMany({
        where,
        select: this.serviceSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.service.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalRecords / take));

    return {
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        type: service.type as ServiceType,
        registrationCode: service.registrationCode,
        price: service.price.toFixed(2),
        description: service.description,
        imageUrl: service.imageUrl,
        imageKey: service.imageKey,
        isActive: service.isActive,
        categoryId: service.categoryId,
        category: {
          id: service.category.id,
          name: service.category.name,
          slug: service.category.slug,
          iconUrl: service.category.iconUrl,
          iconKey: service.category.iconKey,
          isActive: service.category.isActive,
          sortOrder: service.category.sortOrder,
          createdAt: service.category.createdAt,
          updatedAt: service.category.updatedAt,
        },
        userId: service.userId,
        user: {
          id: service.user.id,
          name: service.user.name,
          email: service.user.email,
          phone: service.user.phone,
        },
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      })),
      currentPage: page,
      totalPages,
      totalRecords,
    };
  }

  async findMyServices(user: User, query: QueryServiceDto): Promise<ResponseFindAllServiceDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const name = query.name ? query.name.trim() : undefined;
    const categoryId = query.categoryId
      ? parsePositiveInt(query.categoryId, 'categoryId')
      : undefined;
    const isActive =
      query.isActive !== undefined ? parseBooleanString(query.isActive, 'isActive') : undefined;

    const where: Prisma.ServiceWhereInput = {
      name: name ? { contains: name } : undefined,
      categoryId,
      type: query.type,
      userId: user.id,
      isActive,
    };

    const [services, totalRecords] = await Promise.all([
      this.prisma.service.findMany({
        where,
        select: this.serviceSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.service.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalRecords / take));

    return {
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        type: service.type as ServiceType,
        registrationCode: service.registrationCode,
        price: service.price.toFixed(2),
        description: service.description,
        imageUrl: service.imageUrl,
        imageKey: service.imageKey,
        isActive: service.isActive,
        categoryId: service.categoryId,
        category: {
          id: service.category.id,
          name: service.category.name,
          slug: service.category.slug,
          iconUrl: service.category.iconUrl,
          iconKey: service.category.iconKey,
          isActive: service.category.isActive,
          sortOrder: service.category.sortOrder,
          createdAt: service.category.createdAt,
          updatedAt: service.category.updatedAt,
        },
        userId: service.userId,
        user: {
          id: service.user.id,
          name: service.user.name,
          email: service.user.email,
          phone: service.user.phone,
        },
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      })),
      currentPage: page,
      totalPages,
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseServiceDto> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: this.serviceSelect,
    });

    if (!service) throw new NotFoundException('Serviço não encontrado.');

    return {
      id: service.id,
      name: service.name,
      type: service.type as ServiceType,
      registrationCode: service.registrationCode,
      price: service.price.toFixed(2),
      description: service.description,
      imageUrl: service.imageUrl,
      imageKey: service.imageKey,
      isActive: service.isActive,
      categoryId: service.categoryId,
      category: {
        id: service.category.id,
        name: service.category.name,
        slug: service.category.slug,
        iconUrl: service.category.iconUrl,
        iconKey: service.category.iconKey,
        isActive: service.category.isActive,
        sortOrder: service.category.sortOrder,
        createdAt: service.category.createdAt,
        updatedAt: service.category.updatedAt,
      },
      userId: service.userId,
      user: {
        id: service.user.id,
        name: service.user.name,
        email: service.user.email,
        phone: service.user.phone,
      },
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  async findPublicById(id: number): Promise<ResponseServiceDto> {
    const service = await this.prisma.service.findFirst({
      where: { id, isActive: true },
      select: this.serviceSelect,
    });

    if (!service) throw new NotFoundException('Serviço não encontrado.');

    return {
      id: service.id,
      name: service.name,
      type: service.type as ServiceType,
      registrationCode: service.registrationCode,
      price: service.price.toFixed(2),
      description: service.description,
      imageUrl: service.imageUrl,
      imageKey: service.imageKey,
      isActive: service.isActive,
      categoryId: service.categoryId,
      category: {
        id: service.category.id,
        name: service.category.name,
        slug: service.category.slug,
        iconUrl: service.category.iconUrl,
        iconKey: service.category.iconKey,
        isActive: service.category.isActive,
        sortOrder: service.category.sortOrder,
        createdAt: service.category.createdAt,
        updatedAt: service.category.updatedAt,
      },
      userId: service.userId,
      user: {
        id: service.user.id,
        name: service.user.name,
        email: service.user.email,
        phone: service.user.phone,
      },
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  async update(user: User, id: number, payload: UpdateServiceDto): Promise<ResponseServiceDto> {
    const service = await this.findById(id);

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isOwner = user.id === service.userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Acesso não autorizado.');
    }

    const categoryId = payload.categoryId
      ? parsePositiveInt(payload.categoryId, 'categoryId')
      : undefined;

    if (categoryId) await this.findCategoryById(categoryId);

    try {
      await this.prisma.service.update({
        where: { id },
        data: {
          name: payload.name ? capitalizeFirstLetter(payload.name.trim()) : undefined,
          type: payload.type,
          registrationCode:
            payload.registrationCode !== undefined
              ? payload.registrationCode
                ? payload.registrationCode.trim()
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
        throw new BadRequestException(
          'Não foi possível persistir o serviço com os dados informados.',
        );
      }

      throw error;
    }

    return this.findById(id);
  }

  async delete(user: User, id: number): Promise<ImessageEntity> {
    const service = await this.findById(id);

    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isOwner = user.id === service.userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Acesso não autorizado.');
    }

    await this.prisma.service.delete({ where: { id } });

    return { message: 'Serviço deletado com sucesso.' };
  }

  private async findCategoryById(id: number) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, isActive: true },
    });

    if (!category) throw new NotFoundException('Categoria de serviço não encontrada.');

    return category;
  }
}
