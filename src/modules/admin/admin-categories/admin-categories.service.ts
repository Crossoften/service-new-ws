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

/**
 * Só `ServiceCategory` tem a coluna `platformFeeRate` no schema. As categorias
 * de produto, hospedagem e transporte não têm.
 *
 * Mandar o campo para elas faz o client do Prisma recusar a consulta antes do
 * banco, e o filtro traduz isso em `400 PRISMA_VALIDATION` — um erro que culpa
 * a requisição quando o problema é a consulta. Era por isso que `findAll` e
 * `create` nunca funcionaram fora de `services`.
 */
const CONTEXTO_COM_TAXA: CategoryContext = 'services';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly _prisma: PrismaService) {}

  private temTaxaDaPlataforma(context: string): boolean {
    return context === CONTEXTO_COM_TAXA;
  }

  /**
   * Recusa a taxa nos contextos que não a têm, em vez de ignorá-la em silêncio.
   * Ignorar faria o admin achar que gravou uma taxa que nunca existiu.
   */
  private recusarTaxaForaDeServicos(context: string, platformFeeRate?: number): void {
    if (platformFeeRate === undefined || this.temTaxaDaPlataforma(context)) return;

    throw new BadRequestException(
      `A taxa da plataforma existe apenas nas categorias de ${CONTEXTO_COM_TAXA}. ` +
        `Remova 'platformFeeRate' da requisição de ${context}.`,
    );
  }

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
    this.recusarTaxaForaDeServicos(context, data.platformFeeRate);

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
        ...(this.temTaxaDaPlataforma(context) && {
          platformFeeRate: data.platformFeeRate ?? 10,
        }),
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
        ...(this.temTaxaDaPlataforma(context) && { platformFeeRate: true }),
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
    this.recusarTaxaForaDeServicos(context, data.platformFeeRate);

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
