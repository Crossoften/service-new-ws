import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { FoodOrderStatusEnum, Prisma, User } from '@prisma/client';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { QueryRestaurantDto } from './dto/query-restaurant.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateMenuItemAdditionDto } from './dto/create-menu-item-addition.dto';
import { UpdateMenuItemAdditionDto } from './dto/update-menu-item-addition.dto';
import {
  CreateRestaurantResponseDto,
  ResponseFindAllRestaurantDto,
  ResponseMenuCategoryDto,
  ResponseRestaurantCategoryDto,
  ResponseRestaurantDto,
  ResponseRestaurantPayoutDto,
} from './dto/response-restaurant.dto';
import { RestaurantNotFoundException } from './exceptions/restaurant-not-found.exception';
import { RestaurantAlreadyExistsException } from './exceptions/restaurant-already-exists.exception';
import { RestaurantAccessDeniedException } from './exceptions/restaurant-access-denied.exception';
import { RestaurantCategoryNotFoundException } from './exceptions/restaurant-category-not-found.exception';
import { MenuCategoryNotFoundException } from './exceptions/menu-category-not-found.exception';
import { MenuItemNotFoundException } from './exceptions/menu-item-not-found.exception';
import { MenuItemAdditionNotFoundException } from './exceptions/menu-item-addition-not-found.exception';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGuard: SubscriptionGuardService,
  ) {}

  private readonly restaurantSelect = Prisma.validator<Prisma.RestaurantSelect>()({
    id: true,
    name: true,
    description: true,
    imageUrl: true,
    isActive: true,
    isOpen: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true, slug: true, iconUrl: true } },
  });

  private readonly restaurantWithMenuSelect = Prisma.validator<Prisma.RestaurantSelect>()({
    id: true,
    name: true,
    description: true,
    imageUrl: true,
    isActive: true,
    isOpen: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true, slug: true, iconUrl: true } },
    menuCategories: {
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        items: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isActive: true,
            menuCategoryId: true,
            additions: { select: { id: true, name: true, price: true, isActive: true } },
          },
        },
      },
    },
  });

  async listCategories(): Promise<ResponseRestaurantCategoryDto[]> {
    const categories = await this.prisma.restaurantCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, iconUrl: true },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl ?? undefined,
    }));
  }

  async create(user: User, payload: CreateRestaurantDto): Promise<CreateRestaurantResponseDto> {
    await this.subscriptionGuard.assertActiveSubscription(user, { allowCommissionBilling: true });

    const existing = await this.prisma.restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existing) throw new RestaurantAlreadyExistsException();

    const category = await this.prisma.restaurantCategory.findUnique({
      where: { id: payload.categoryId },
      select: { id: true, isActive: true },
    });
    if (!category || !category.isActive) throw new RestaurantCategoryNotFoundException();

    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: payload.name,
        description: payload.description?.trim() || null,
        imageUrl: payload.imageUrl || null,
        imageKey: payload.imageKey || null,
        categoryId: payload.categoryId,
        userId: user.id,
      },
      select: { id: true },
    });

    return {
      message: 'Restaurante cadastrado com sucesso.',
      restaurant: await this.findById(restaurant.id),
    };
  }

  async findAll(query: QueryRestaurantDto): Promise<ResponseFindAllRestaurantDto> {
    const take = query.take ?? 10;
    const currentPage = query.skip ?? 1;

    const where: Prisma.RestaurantWhereInput = {
      isActive: true,
      ...(query.categoryId && { categoryId: query.categoryId }),
    };

    const [restaurants, totalRecords] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        select: this.restaurantSelect,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (currentPage - 1) * take,
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return {
      restaurants: restaurants.map((restaurant) => this.toResponseDto(restaurant)),
      currentPage,
      totalPages: totalRecords > 0 ? Math.ceil(totalRecords / take) : 1,
      totalRecords,
    };
  }

  async findMine(user: User): Promise<ResponseRestaurantDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId: user.id },
      select: this.restaurantWithMenuSelect,
    });
    if (!restaurant) throw new RestaurantNotFoundException();
    return this.toResponseDto(restaurant);
  }

  async findMyPayouts(user: User): Promise<ResponseRestaurantPayoutDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!restaurant) throw new RestaurantNotFoundException();

    const aggregate = await this.prisma.foodOrder.aggregate({
      where: { restaurantId: restaurant.id, status: FoodOrderStatusEnum.Delivered },
      _count: { _all: true },
      _sum: { itemsValue: true, commissionAmount: true },
    });

    const totalItemsValue = aggregate._sum.itemsValue ?? new Prisma.Decimal(0);
    const totalCommission = aggregate._sum.commissionAmount ?? new Prisma.Decimal(0);

    return {
      billingType: user.billingType ?? 'None',
      commissionRate: user.commissionRate ? user.commissionRate.toFixed(2) : undefined,
      totalOrders: aggregate._count._all,
      totalItemsValue: totalItemsValue.toFixed(2),
      totalCommission: totalCommission.toFixed(2),
      netAmount: totalItemsValue.minus(totalCommission).toFixed(2),
    };
  }

  async findById(id: number): Promise<ResponseRestaurantDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: this.restaurantWithMenuSelect,
    });
    if (!restaurant) throw new RestaurantNotFoundException();
    return this.toResponseDto(restaurant);
  }

  async update(
    user: User,
    id: number,
    payload: UpdateRestaurantDto,
  ): Promise<ResponseRestaurantDto> {
    const restaurant = await this.findRawById(id);
    if (restaurant.userId !== user.id) throw new RestaurantAccessDeniedException();

    if (payload.categoryId) {
      const category = await this.prisma.restaurantCategory.findUnique({
        where: { id: payload.categoryId },
        select: { id: true, isActive: true },
      });
      if (!category || !category.isActive) throw new RestaurantCategoryNotFoundException();
    }

    await this.prisma.restaurant.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description?.trim(),
        imageUrl: payload.imageUrl,
        imageKey: payload.imageKey,
        categoryId: payload.categoryId,
        isOpen: payload.isOpen,
        isActive: payload.isActive,
      },
    });

    return this.findById(id);
  }

  async createMenuCategory(
    user: User,
    payload: CreateMenuCategoryDto,
  ): Promise<ResponseMenuCategoryDto> {
    const restaurant = await this.findRawByUserId(user.id);

    const category = await this.prisma.menuCategory.create({
      data: {
        name: payload.name,
        sortOrder: payload.sortOrder ?? 0,
        restaurantId: restaurant.id,
      },
      select: { id: true, name: true, sortOrder: true },
    });

    return category;
  }

  async updateMenuCategory(
    user: User,
    id: number,
    payload: UpdateMenuCategoryDto,
  ): Promise<ResponseMenuCategoryDto> {
    const category = await this.findRawMenuCategoryById(id);
    const restaurant = await this.findRawByUserId(user.id);
    if (category.restaurantId !== restaurant.id) throw new RestaurantAccessDeniedException();

    const updated = await this.prisma.menuCategory.update({
      where: { id },
      data: { name: payload.name, sortOrder: payload.sortOrder },
      select: { id: true, name: true, sortOrder: true },
    });

    return updated;
  }

  async createMenuItem(user: User, payload: CreateMenuItemDto) {
    const restaurant = await this.findRawByUserId(user.id);
    const category = await this.findRawMenuCategoryById(payload.menuCategoryId);
    if (category.restaurantId !== restaurant.id) throw new RestaurantAccessDeniedException();

    const item = await this.prisma.menuItem.create({
      data: {
        name: payload.name,
        description: payload.description?.trim() || null,
        price: new Prisma.Decimal(payload.price),
        imageUrl: payload.imageUrl || null,
        imageKey: payload.imageKey || null,
        restaurantId: restaurant.id,
        menuCategoryId: payload.menuCategoryId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isActive: true,
        menuCategoryId: true,
      },
    });

    return this.toMenuItemResponseDto(item);
  }

  async updateMenuItem(user: User, id: number, payload: UpdateMenuItemDto) {
    const item = await this.findRawMenuItemById(id);
    const restaurant = await this.findRawByUserId(user.id);
    if (item.restaurantId !== restaurant.id) throw new RestaurantAccessDeniedException();

    if (payload.menuCategoryId) {
      const category = await this.findRawMenuCategoryById(payload.menuCategoryId);
      if (category.restaurantId !== restaurant.id) throw new RestaurantAccessDeniedException();
    }

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description?.trim(),
        price: payload.price !== undefined ? new Prisma.Decimal(payload.price) : undefined,
        imageUrl: payload.imageUrl,
        imageKey: payload.imageKey,
        menuCategoryId: payload.menuCategoryId,
        isActive: payload.isActive,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isActive: true,
        menuCategoryId: true,
      },
    });

    return this.toMenuItemResponseDto(updated);
  }

  async createMenuItemAddition(user: User, menuItemId: number, payload: CreateMenuItemAdditionDto) {
    const item = await this.findRawMenuItemById(menuItemId);
    const restaurant = await this.findRawByUserId(user.id);
    if (item.restaurantId !== restaurant.id) throw new RestaurantAccessDeniedException();

    const addition = await this.prisma.menuItemAddition.create({
      data: {
        name: payload.name,
        price:
          payload.price !== undefined ? new Prisma.Decimal(payload.price) : new Prisma.Decimal(0),
        menuItemId,
      },
      select: { id: true, name: true, price: true, isActive: true },
    });

    return { ...addition, price: addition.price.toFixed(2) };
  }

  async updateMenuItemAddition(user: User, id: number, payload: UpdateMenuItemAdditionDto) {
    const addition = await this.findRawMenuItemAdditionById(id);
    const item = await this.findRawMenuItemById(addition.menuItemId);
    const restaurant = await this.findRawByUserId(user.id);
    if (item.restaurantId !== restaurant.id) throw new RestaurantAccessDeniedException();

    const updated = await this.prisma.menuItemAddition.update({
      where: { id },
      data: {
        name: payload.name,
        price: payload.price !== undefined ? new Prisma.Decimal(payload.price) : undefined,
        isActive: payload.isActive,
      },
      select: { id: true, name: true, price: true, isActive: true },
    });

    return { ...updated, price: updated.price.toFixed(2) };
  }

  private async findRawById(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!restaurant) throw new RestaurantNotFoundException();
    return restaurant;
  }

  private async findRawByUserId(userId: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    if (!restaurant) throw new RestaurantNotFoundException();
    return restaurant;
  }

  private async findRawMenuCategoryById(id: number) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      select: { id: true, restaurantId: true },
    });
    if (!category) throw new MenuCategoryNotFoundException();
    return category;
  }

  private async findRawMenuItemById(id: number) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      select: { id: true, restaurantId: true, menuCategoryId: true },
    });
    if (!item) throw new MenuItemNotFoundException();
    return item;
  }

  private async findRawMenuItemAdditionById(id: number) {
    const addition = await this.prisma.menuItemAddition.findUnique({
      where: { id },
      select: { id: true, menuItemId: true },
    });
    if (!addition) throw new MenuItemAdditionNotFoundException();
    return addition;
  }

  private toMenuItemResponseDto(item: any) {
    return {
      id: item.id,
      name: item.name,
      description: item.description ?? undefined,
      price: item.price.toFixed(2),
      imageUrl: item.imageUrl ?? undefined,
      isActive: item.isActive,
      menuCategoryId: item.menuCategoryId,
    };
  }

  private toResponseDto(restaurant: any): ResponseRestaurantDto {
    return {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description ?? undefined,
      imageUrl: restaurant.imageUrl ?? undefined,
      isActive: restaurant.isActive,
      isOpen: restaurant.isOpen,
      category: {
        id: restaurant.category.id,
        name: restaurant.category.name,
        slug: restaurant.category.slug,
        iconUrl: restaurant.category.iconUrl ?? undefined,
      },
      userId: restaurant.userId,
      menuCategories: restaurant.menuCategories?.map((menuCategory: any) => ({
        id: menuCategory.id,
        name: menuCategory.name,
        sortOrder: menuCategory.sortOrder,
        items: menuCategory.items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? undefined,
          price: item.price.toFixed(2),
          imageUrl: item.imageUrl ?? undefined,
          isActive: item.isActive,
          menuCategoryId: item.menuCategoryId,
          additions: item.additions?.map((addition: any) => ({
            id: addition.id,
            name: addition.name,
            price: addition.price.toFixed(2),
            isActive: addition.isActive,
          })),
        })),
      })),
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
    };
  }
}
