import { PrismaService } from '@database/PrismaService';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdatePlatformFeeRateDto } from './dto/update-platformfeerate.dto';
import { ResponseCategoryDto } from './dto/response-create-category.dto';

type CategoryContext = 'services' | 'products' | 'accommodations' | 'transportations';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly _prisma: PrismaService) {}

  private getDelegate(context: string) {
    const delegates: Record<CategoryContext, any> = {
      services: this._prisma.serviceCategory,
      products: this._prisma.productCategory,
      accommodations: this._prisma.accommodationCategory,
      transportations: this._prisma.transportationCategory,
    };

    if (!(context in delegates)) {
      throw new BadRequestException(
        'Contexto inválido. Use: services, products, accommodations ou transportations.',
      );
    }

    return delegates[context as CategoryContext];
  }

  private formatCategory(category: any): ResponseCategoryDto {
    return {
      ...category,
      platformFeeRate:
        category.platformFeeRate !== null && category.platformFeeRate !== undefined
          ? Number(category.platformFeeRate)
          : undefined,
    };
  }

  async create(context: string, data: CreateCategoryDto): Promise<ResponseCategoryDto> {
    const delegate = this.getDelegate(context);

    const categoryExists = await delegate.findFirst({
      where: {
        OR: [{ name: data.name }, { slug: data.slug }],
      },
    });

    if (categoryExists) {
      throw new ConflictException(
        `Já existe uma categoria com o nome '${data.name}' ou slug '${data.slug}' no módulo de ${context}.`,
      );
    }

    const newCategory = await delegate.create({
      data: {
        name: data.name,
        slug: data.slug,
        iconUrl: data.iconUrl,
        iconKey: data.iconKey,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        platformFeeRate: data.platformFeeRate ?? 10,
      },
    });

    return this.formatCategory(newCategory);
  }

  async findAll(context: string): Promise<ResponseCategoryDto[]> {
    const delegate = this.getDelegate(context);

    const categories = await delegate.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        iconUrl: true,
        iconKey: true,
        isActive: true,
        sortOrder: true,
        platformFeeRate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return categories.map((cat: any) => this.formatCategory(cat));
  }

  async findOne(context: string, id: number): Promise<ResponseCategoryDto> {
    const delegate = this.getDelegate(context);

    const category = await delegate.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(
        `Categoria com ID ${id} não foi encontrada no contexto de ${context}.`,
      );
    }

    return this.formatCategory(category);
  }

  async update(context: string, id: number, data: UpdateCategoryDto): Promise<ResponseCategoryDto> {
    const delegate = this.getDelegate(context);

    const categoryExists = await delegate.findUnique({
      where: { id },
    });

    if (!categoryExists) {
      throw new NotFoundException(`Categoria não encontrada no contexto '${context}'.`);
    }

    const updatedCategory = await delegate.update({
      where: { id },
      data,
    });

    return this.formatCategory(updatedCategory);
  }

  async updatePlatformFeeRate(
    id: number,
    data: UpdatePlatformFeeRateDto,
  ): Promise<ResponseCategoryDto> {
    const category = await this._prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    const updatedCategory = await this._prisma.serviceCategory.update({
      where: { id },
      data: {
        platformFeeRate: data.platformFeeRate,
      },
    });

    return this.formatCategory(updatedCategory);
  }

  async inactivate(context: string, id: number): Promise<ResponseCategoryDto> {
    const delegate = this.getDelegate(context);

    const categoryExists = await delegate.findUnique({
      where: { id },
    });

    if (!categoryExists) {
      throw new NotFoundException(
        `Categoria com ID ${id} não foi encontrada no contexto de ${context}.`,
      );
    }

    const inactiveCategory = await delegate.update({
      where: { id },
      data: { isActive: false },
    });

    return this.formatCategory(inactiveCategory);
  }
}
