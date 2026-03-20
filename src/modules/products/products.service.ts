import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import capitalizeFirstLetter from '@utils/capitalizeFirstLetter';
import { parseBooleanString } from '@utils/parseBooleanString';
import { parseOptionalBooleanString } from '@utils/parseOptionalBooleanString';
import { parsePositiveInt } from '@utils/parsePositiveInt';
import { parsePriceDecimal } from '@utils/parsePriceDecimal';
import { CreateProductResponseDto } from './dto/create-product-response.dto';
import { CreateProductReviewResponseDto } from './dto/create-product-review-response.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ResponseFindAllProductDto } from './dto/response-find-all-product.dto';
import { ResponseProductCategoryDto } from './dto/response-product-category.dto';
import { ResponseProductDto } from './dto/response-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductAccessDeniedException } from './exceptions/product-access-denied.exception';
import { ProductCategoryNotFoundException } from './exceptions/product-category-not-found.exception';
import { ProductNotFoundException } from './exceptions/product-not-found.exception';
import { ProductPersistenceException } from './exceptions/product-persistence.exception';
import { ProductSelfReviewNotAllowedException } from './exceptions/product-self-review-not-allowed.exception';
import { ProductTransactionType } from './enums/product-transaction-type.enum';
import { ReviewType } from 'src/modules/services/enums/service-review-type.enum';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly productSelect = Prisma.validator<Prisma.ProductSelect>()({
    id: true,
    name: true,
    transactionType: true,
    model: true,
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

  private readonly productListSelect = Prisma.validator<Prisma.ProductSelect>()({
    id: true,
    name: true,
    transactionType: true,
    model: true,
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

  async create(user: User, payload: CreateProductDto): Promise<CreateProductResponseDto> {
    const categoryId = parsePositiveInt(payload.categoryId, 'categoryId');
    const price = parsePriceDecimal(payload.price);
    const isActive = parseOptionalBooleanString(payload.isActive, 'isActive');
    const year = payload.year ? parsePositiveInt(payload.year, 'year') : null;

    await this.findCategoryById(categoryId);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: capitalizeFirstLetter(payload.name.trim()),
          transactionType: payload.transactionType,
          model: payload.model ? payload.model.trim() : null,
          year,
          price,
          description: payload.description ? payload.description.trim() : null,
          imageUrl: payload.imageUrl || null,
          imageKey: payload.imageKey || null,
          isActive: isActive ?? true,
          categoryId,
          userId: user.id,
        },
        select: this.productSelect,
      });

      return {
        message: 'Produto cadastrado com sucesso.',
        product: {
          id: product.id,
          name: product.name,
          transactionType: product.transactionType as ProductTransactionType,
          model: product.model || undefined,
          year: product.year || undefined,
          price: product.price.toFixed(2),
          description: product.description || undefined,
          imageUrl: product.imageUrl || undefined,
          imageKey: product.imageKey || undefined,
          isActive: product.isActive,
          categoryId: product.categoryId,
          category: {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
            iconUrl: product.category.iconUrl || undefined,
            iconKey: product.category.iconKey || undefined,
            isActive: product.category.isActive,
            sortOrder: product.category.sortOrder,
            createdAt: product.category.createdAt,
            updatedAt: product.category.updatedAt,
          },
          userId: product.userId,
          user: {
            id: product.user.id,
            name: product.user.name,
            email: product.user.email,
            phone: product.user.phone || undefined,
          },
          positiveReviews: 0,
          negativeReviews: 0,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new ProductPersistenceException();
      }

      throw error;
    }
  }

  async findAllCategories(): Promise<ResponseProductCategoryDto[]> {
    const categories = await this.prisma.productCategory.findMany({
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

  async findAll(query: QueryProductDto): Promise<ResponseFindAllProductDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const search = query.search?.trim() || query.name?.trim() || undefined;
    const categoryId = query.categoryId
      ? parsePositiveInt(query.categoryId, 'categoryId')
      : undefined;
    const userId = query.userId ? parsePositiveInt(query.userId, 'userId') : undefined;
    const transactionType = query.transactionType;
    const isActive =
      query.isActive !== undefined ? parseBooleanString(query.isActive, 'isActive') : true;

    const where: Prisma.ProductWhereInput = {
      categoryId,
      userId,
      transactionType,
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

    const [products, totalRecords] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: this.productListSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.product.count({ where }),
    ]);
    const productIds = products.map((product) => product.id);
    const reviewCounts =
      productIds.length > 0
        ? await this.prisma.review.findMany({
            where: {
              productId: { in: productIds },
            },
            select: {
              productId: true,
              type: true,
            },
          })
        : [];

    return {
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        transactionType: product.transactionType as ProductTransactionType,
        model: product.model || undefined,
        year: product.year || undefined,
        price: product.price.toFixed(2),
        description: product.description || undefined,
        imageUrl: product.imageUrl || undefined,
        isActive: product.isActive,
        category: {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
          iconUrl: product.category.iconUrl || undefined,
        },
        user: {
          id: product.user.id,
          name: product.user.name,
          phone: product.user.phone || undefined,
        },
        positiveReviews: reviewCounts
          .filter(
            (review) => review.productId === product.id && review.type === ReviewType.Positive,
          )
          .reduce((total) => total + 1, 0),
        negativeReviews: reviewCounts
          .filter(
            (review) => review.productId === product.id && review.type === ReviewType.Negative,
          )
          .reduce((total) => total + 1, 0),
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findMyProducts(user: User, query: QueryProductDto): Promise<ResponseFindAllProductDto> {
    const take = query.take ? parsePositiveInt(query.take, 'take') : 10;
    const page = query.skip ? parsePositiveInt(query.skip, 'skip') : 1;
    const search = query.search?.trim() || query.name?.trim() || undefined;
    const categoryId = query.categoryId
      ? parsePositiveInt(query.categoryId, 'categoryId')
      : undefined;
    const transactionType = query.transactionType;
    const isActive =
      query.isActive !== undefined ? parseBooleanString(query.isActive, 'isActive') : undefined;

    const where: Prisma.ProductWhereInput = {
      categoryId,
      userId: user.id,
      transactionType,
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

    const [products, totalRecords] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: this.productListSelect,
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.product.count({ where }),
    ]);
    const productIds = products.map((product) => product.id);
    const reviewCounts =
      productIds.length > 0
        ? await this.prisma.review.findMany({
            where: {
              productId: { in: productIds },
            },
            select: {
              productId: true,
              type: true,
            },
          })
        : [];

    return {
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        transactionType: product.transactionType as ProductTransactionType,
        model: product.model || undefined,
        year: product.year || undefined,
        price: product.price.toFixed(2),
        description: product.description || undefined,
        imageUrl: product.imageUrl || undefined,
        isActive: product.isActive,
        category: {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
          iconUrl: product.category.iconUrl || undefined,
        },
        user: {
          id: product.user.id,
          name: product.user.name,
          phone: product.user.phone || undefined,
        },
        positiveReviews: reviewCounts
          .filter(
            (review) => review.productId === product.id && review.type === ReviewType.Positive,
          )
          .reduce((total) => total + 1, 0),
        negativeReviews: reviewCounts
          .filter(
            (review) => review.productId === product.id && review.type === ReviewType.Negative,
          )
          .reduce((total) => total + 1, 0),
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async findById(id: number): Promise<ResponseProductDto> {
    const [product, reviewCounts] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id },
        select: this.productSelect,
      }),
      this.prisma.review.findMany({
        where: {
          productId: id,
        },
        select: {
          type: true,
        },
      }),
    ]);

    if (!product) {
      throw new ProductNotFoundException();
    }

    return {
      id: product.id,
      name: product.name,
      transactionType: product.transactionType as ProductTransactionType,
      model: product.model || undefined,
      year: product.year || undefined,
      price: product.price.toFixed(2),
      description: product.description || undefined,
      imageUrl: product.imageUrl || undefined,
      imageKey: product.imageKey || undefined,
      isActive: product.isActive,
      categoryId: product.categoryId,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        iconUrl: product.category.iconUrl || undefined,
        iconKey: product.category.iconKey || undefined,
        isActive: product.category.isActive,
        sortOrder: product.category.sortOrder,
        createdAt: product.category.createdAt,
        updatedAt: product.category.updatedAt,
      },
      userId: product.userId,
      user: {
        id: product.user.id,
        name: product.user.name,
        email: product.user.email,
        phone: product.user.phone || undefined,
      },
      positiveReviews: reviewCounts
        .filter((review) => review.type === ReviewType.Positive)
        .reduce((total) => total + 1, 0),
      negativeReviews: reviewCounts
        .filter((review) => review.type === ReviewType.Negative)
        .reduce((total) => total + 1, 0),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async findPublicById(id: number): Promise<ResponseProductDto> {
    const [product, reviewCounts] = await Promise.all([
      this.prisma.product.findFirst({
        where: { id, isActive: true },
        select: this.productSelect,
      }),
      this.prisma.review.findMany({
        where: {
          productId: id,
        },
        select: {
          type: true,
        },
      }),
    ]);

    if (!product) {
      throw new ProductNotFoundException();
    }

    return {
      id: product.id,
      name: product.name,
      transactionType: product.transactionType as ProductTransactionType,
      model: product.model || undefined,
      year: product.year || undefined,
      price: product.price.toFixed(2),
      description: product.description || undefined,
      imageUrl: product.imageUrl || undefined,
      imageKey: product.imageKey || undefined,
      isActive: product.isActive,
      categoryId: product.categoryId,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        iconUrl: product.category.iconUrl || undefined,
        iconKey: product.category.iconKey || undefined,
        isActive: product.category.isActive,
        sortOrder: product.category.sortOrder,
        createdAt: product.category.createdAt,
        updatedAt: product.category.updatedAt,
      },
      userId: product.userId,
      user: {
        id: product.user.id,
        name: product.user.name,
        email: product.user.email,
        phone: product.user.phone || undefined,
      },
      positiveReviews: reviewCounts
        .filter((review) => review.type === ReviewType.Positive)
        .reduce((total) => total + 1, 0),
      negativeReviews: reviewCounts
        .filter((review) => review.type === ReviewType.Negative)
        .reduce((total) => total + 1, 0),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async review(
    user: User,
    id: number,
    payload: CreateProductReviewDto,
  ): Promise<CreateProductReviewResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!product) {
      throw new ProductNotFoundException();
    }

    if (product.userId === user.id) {
      throw new ProductSelfReviewNotAllowedException();
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        productId: id,
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
          productId: id,
          requesterId: user.id,
        },
      });
    }

    return {
      message: 'Avaliação do produto registrada com sucesso.',
      product: await this.findPublicById(id),
    };
  }

  async update(user: User, id: number, payload: UpdateProductDto): Promise<ResponseProductDto> {
    const product = await this.findById(id);
    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isOwner = user.id === product.userId;

    if (!isAdmin && !isOwner) {
      throw new ProductAccessDeniedException();
    }

    const categoryId = payload.categoryId
      ? parsePositiveInt(payload.categoryId, 'categoryId')
      : undefined;

    if (categoryId) {
      await this.findCategoryById(categoryId);
    }

    try {
      await this.prisma.product.update({
        where: { id },
        data: {
          name: payload.name ? capitalizeFirstLetter(payload.name.trim()) : undefined,
          transactionType: payload.transactionType,
          model:
            payload.model !== undefined ? (payload.model ? payload.model.trim() : null) : undefined,
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
        throw new ProductPersistenceException();
      }

      throw error;
    }

    return this.findById(id);
  }

  async delete(user: User, id: number): Promise<ImessageEntity> {
    const product = await this.findById(id);
    const isAdmin = user.role === Role.Admin || user.role === Role.Master;
    const isOwner = user.id === product.userId;

    if (!isAdmin && !isOwner) {
      throw new ProductAccessDeniedException();
    }

    await this.prisma.product.delete({ where: { id } });

    return { message: 'Produto deletado com sucesso.' };
  }

  private async findCategoryById(id: number) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new ProductCategoryNotFoundException();
    }

    return category;
  }
}
