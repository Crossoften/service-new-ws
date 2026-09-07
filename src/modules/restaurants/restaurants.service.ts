import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { FoodOrderStatusEnum, Prisma, ReviewTypeEnum, User } from '@prisma/client';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantAddressDto } from './dto/restaurant-address.dto';
import {
  QueryRestaurantPayoutDto,
  RestaurantPayoutPeriodEnum,
} from './dto/query-restaurant-payout.dto';
import { RestaurantInvalidDeliveryTimeException } from './exceptions/restaurant-invalid-delivery-time.exception';
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
import { RestaurantReviewNotAllowedException } from './exceptions/restaurant-review-not-allowed.exception';
import { RestaurantAlreadyReviewedException } from './exceptions/restaurant-already-reviewed.exception';
import { CreateRestaurantReviewDto } from './dto/create-restaurant-review.dto';
import { CreateRestaurantReviewResponseDto } from './dto/response-restaurant-review.dto';
import { MenuItemDeletionResultDto } from './dto/response-menu-item-deletion.dto';

interface RestaurantRating {
  average?: number;
  count: number;
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGuard: SubscriptionGuardService,
  ) {}

  private readonly addressSelect = Prisma.validator<Prisma.AddressSelect>()({
    id: true,
    street: true,
    number: true,
    neighborhood: true,
    city: true,
    state: true,
    zipCode: true,
    latitude: true,
    longitude: true,
  });

  private readonly restaurantSelect = Prisma.validator<Prisma.RestaurantSelect>()({
    id: true,
    name: true,
    description: true,
    imageUrl: true,
    isActive: true,
    isOpen: true,
    userId: true,
    deliveryTimeMinMinutes: true,
    deliveryTimeMaxMinutes: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true, slug: true, iconUrl: true } },
    address: { select: this.addressSelect },
  });

  private readonly restaurantWithMenuSelect = Prisma.validator<Prisma.RestaurantSelect>()({
    id: true,
    name: true,
    description: true,
    imageUrl: true,
    isActive: true,
    isOpen: true,
    userId: true,
    deliveryTimeMinMinutes: true,
    deliveryTimeMaxMinutes: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true, slug: true, iconUrl: true } },
    address: { select: this.addressSelect },
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

    this.assertDeliveryTimeRange(payload.deliveryTimeMinMinutes, payload.deliveryTimeMaxMinutes);

    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: payload.name,
        description: payload.description?.trim() || null,
        imageUrl: payload.imageUrl || null,
        imageKey: payload.imageKey || null,
        categoryId: payload.categoryId,
        userId: user.id,
        // O `addressId` existia no schema desde sempre e nada o preenchia: o
        // restaurante nascia sem endereço, e o frete por distância ficava sem
        // origem para calcular.
        addressId: payload.address ? (await this.createAddress(payload.address)).id : undefined,
        deliveryTimeMinMinutes: payload.deliveryTimeMinMinutes,
        deliveryTimeMaxMinutes: payload.deliveryTimeMaxMinutes,
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

    const ratings = await this.ratingsFor(restaurants.map((restaurant) => restaurant.id));

    return {
      restaurants: restaurants.map((restaurant) =>
        this.toResponseDto(restaurant, ratings.get(restaurant.id)),
      ),
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

    const ratings = await this.ratingsFor([restaurant.id]);
    return this.toResponseDto(restaurant, ratings.get(restaurant.id));
  }

  async findMyPayouts(
    user: User,
    query: QueryRestaurantPayoutDto = {},
  ): Promise<ResponseRestaurantPayoutDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!restaurant) throw new RestaurantNotFoundException();

    const desde = this.payoutPeriodStart(query.period);

    const aggregate = await this.prisma.foodOrder.aggregate({
      where: {
        restaurantId: restaurant.id,
        status: FoodOrderStatusEnum.Delivered,
        ...(desde ? { updatedAt: { gte: desde } } : {}),
      },
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
      period: query.period ?? 'all',
    };
  }

  /**
   * Início do recorte, nas mesmas fronteiras dos ganhos do entregador.
   *
   * Sem período, devolve `undefined` e o relatório considera todo o histórico —
   * que era o único comportamento antes deste parâmetro existir.
   */
  private payoutPeriodStart(period?: RestaurantPayoutPeriodEnum): Date | undefined {
    if (!period) return undefined;

    const agora = new Date();
    const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    if (period === RestaurantPayoutPeriodEnum.Day) return inicioDoDia;

    if (period === RestaurantPayoutPeriodEnum.Week) {
      const inicioDaSemana = new Date(inicioDoDia);

      inicioDaSemana.setDate(inicioDoDia.getDate() - inicioDoDia.getDay());

      return inicioDaSemana;
    }

    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  }

  async findById(id: number): Promise<ResponseRestaurantDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: this.restaurantWithMenuSelect,
    });
    if (!restaurant) throw new RestaurantNotFoundException();

    const ratings = await this.ratingsFor([restaurant.id]);
    return this.toResponseDto(restaurant, ratings.get(restaurant.id));
  }

  async update(
    user: User,
    id: number,
    payload: UpdateRestaurantDto,
  ): Promise<ResponseRestaurantDto> {
    const restaurant = await this.findRawById(id);
    if (restaurant.userId !== user.id) throw new RestaurantAccessDeniedException();

    // Compara com o que já está gravado: mandar só o máximo, menor que o mínimo
    // existente, produziria uma faixa inválida sem que o payload sozinho
    // parecesse errado.
    this.assertDeliveryTimeRange(
      payload.deliveryTimeMinMinutes ?? restaurant.deliveryTimeMinMinutes,
      payload.deliveryTimeMaxMinutes ?? restaurant.deliveryTimeMaxMinutes,
    );

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
        addressId: payload.address
          ? await this.upsertAddressId(restaurant.addressId, payload.address)
          : undefined,
        deliveryTimeMinMinutes: payload.deliveryTimeMinMinutes,
        deliveryTimeMaxMinutes: payload.deliveryTimeMaxMinutes,
      },
    });

    return this.findById(id);
  }

  /**
   * Só os campos informados vão para o banco: mandar `undefined` no Prisma é
   * "não mexe", enquanto `null` apagaria o valor. Atualizar só a coordenada não
   * pode zerar a rua.
   */
  private toAddressData(address: RestaurantAddressDto): Prisma.AddressUpdateInput {
    return {
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      latitude: address.latitude,
      longitude: address.longitude,
    };
  }

  private assertDeliveryTimeRange(minimo?: number | null, maximo?: number | null): void {
    if (minimo != null && maximo != null && maximo < minimo) {
      throw new RestaurantInvalidDeliveryTimeException();
    }
  }

  private async createAddress(address: RestaurantAddressDto): Promise<{ id: number }> {
    return this.prisma.address.create({
      data: this.toAddressData(address) as Prisma.AddressCreateInput,
      select: { id: true },
    });
  }

  /**
   * Atualiza o endereço quando ele já existe, cria quando não.
   *
   * Restaurante cadastrado antes desta entrega não tem endereço nenhum — o que
   * hoje é a totalidade deles.
   */
  private async upsertAddressId(
    addressId: number | null,
    address: RestaurantAddressDto,
  ): Promise<number> {
    if (addressId) {
      await this.prisma.address.update({
        where: { id: addressId },
        data: this.toAddressData(address),
      });

      return addressId;
    }

    return (await this.createAddress(address)).id;
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

  /**
   * Avaliação do restaurante: nota de 1 a 5 e comentário.
   *
   * Duas travas, ambas espelhando o que serviços, produtos, hospedagens e
   * transportes já faziam: só avalia quem tem pedido entregue, e só uma vez.
   * A unicidade também existe no banco (`@@unique`), então uma corrida entre
   * duas requisições simultâneas falha ali em vez de gerar duplicata.
   */
  async review(
    user: User,
    id: number,
    payload: CreateRestaurantReviewDto,
  ): Promise<CreateRestaurantReviewResponseDto> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, isActive: true },
      select: { id: true, userId: true },
    });

    if (!restaurant) throw new RestaurantNotFoundException();
    if (restaurant.userId === user.id) throw new RestaurantReviewNotAllowedException();

    const deliveredOrder = await this.prisma.foodOrder.findFirst({
      where: {
        restaurantId: id,
        customerId: user.id,
        status: FoodOrderStatusEnum.Delivered,
      },
      select: { id: true },
    });

    if (!deliveredOrder) throw new RestaurantReviewNotAllowedException();

    const existing = await this.prisma.review.findFirst({
      where: { restaurantId: id, requesterId: user.id },
      select: { id: true },
    });

    if (existing) throw new RestaurantAlreadyReviewedException();

    const review = await this.prisma.review.create({
      data: {
        // `type` continua obrigatório no modelo, herdado das avaliações que só
        // tinham polegar para cima ou para baixo. Derivado da nota para manter
        // o campo coerente: 4 e 5 são Positive, o resto Negative.
        type: payload.rating >= 4 ? ReviewTypeEnum.Positive : ReviewTypeEnum.Negative,
        rating: payload.rating,
        comment: payload.comment?.trim() || null,
        restaurantId: id,
        requesterId: user.id,
      },
      select: { id: true, rating: true, comment: true, requesterId: true, createdAt: true },
    });

    return {
      message: 'Avaliação registrada com sucesso.',
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment ?? undefined,
        requesterId: review.requesterId,
        createdAt: review.createdAt,
      },
    };
  }

  /**
   * Média e contagem de avaliações, para vários restaurantes de uma vez.
   *
   * Agregado na consulta em vez de guardado em coluna: média materializada
   * desatualiza sem avisar quando uma avaliação é apagada ou corrigida.
   *
   * Em lote, e não um `aggregate` por restaurante: a listagem devolve dez por
   * página, e a versão ingênua faria onze consultas onde uma basta.
   */
  private async ratingsFor(restaurantIds: number[]): Promise<Map<number, RestaurantRating>> {
    const ratings = new Map<number, RestaurantRating>();

    if (restaurantIds.length === 0) return ratings;

    const grouped = await this.prisma.review.groupBy({
      by: ['restaurantId'],
      where: { restaurantId: { in: restaurantIds }, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    for (const row of grouped) {
      if (row.restaurantId === null) continue;

      ratings.set(row.restaurantId, {
        average: row._avg.rating !== null ? Number(row._avg.rating.toFixed(2)) : undefined,
        count: row._count.rating,
      });
    }

    return ratings;
  }

  /**
   * Exclui um item de cardápio.
   *
   * O comportamento depende de o item já ter sido pedido alguma vez:
   *
   * - **Nunca pedido** — apagado de verdade. É o caso do cadastro errado, e
   *   nada no histórico aponta para ele.
   * - **Já pedido** — desativado (`isActive: false`), não apagado. Pedidos
   *   antigos referenciam o item pela relação, e `FoodOrderItem` guarda apenas
   *   o preço praticado, **não o nome**. Apagar o item deixaria pedidos
   *   entregues sem descrição do que foi vendido, além de esbarrar na chave
   *   estrangeira.
   *
   * A resposta diz qual dos dois aconteceu, para a tela não prometer o que não
   * fez.
   */
  async deleteMenuItem(user: User, id: number): Promise<MenuItemDeletionResultDto> {
    const item = await this.findRawMenuItemById(id);
    const restaurant = await this.findRawByUserId(user.id);
    if (item.restaurantId !== restaurant.id) throw new RestaurantAccessDeniedException();

    const orderedOnce = await this.prisma.foodOrderItem.findFirst({
      where: { menuItemId: id },
      select: { id: true },
    });

    if (orderedOnce) {
      await this.prisma.menuItem.update({ where: { id }, data: { isActive: false } });

      return {
        message:
          'Item desativado. Ele já faz parte de pedidos e por isso não pode ser apagado — ' +
          'deixaria o histórico sem a descrição do que foi vendido.',
        deleted: false,
      };
    }

    // Adicionais só existem presos ao item; sem eles a exclusão trava na
    // chave estrangeira.
    await this.prisma.$transaction([
      this.prisma.menuItemAddition.deleteMany({ where: { menuItemId: id } }),
      this.prisma.menuItem.delete({ where: { id } }),
    ]);

    return { message: 'Item excluído com sucesso.', deleted: true };
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
      select: {
        id: true,
        userId: true,
        addressId: true,
        deliveryTimeMinMinutes: true,
        deliveryTimeMaxMinutes: true,
      },
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

  private toResponseDto(restaurant: any, rating?: RestaurantRating): ResponseRestaurantDto {
    return {
      id: restaurant.id,
      // Sem avaliação nenhuma, `ratingAverage` fica ausente e `ratingCount` é 0.
      // O front distingue "ainda não avaliado" de "avaliado com nota baixa".
      ratingAverage: rating?.average,
      ratingCount: rating?.count ?? 0,
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
      deliveryTimeMinMinutes: restaurant.deliveryTimeMinMinutes ?? undefined,
      deliveryTimeMaxMinutes: restaurant.deliveryTimeMaxMinutes ?? undefined,
      address: restaurant.address
        ? {
            id: restaurant.address.id,
            street: restaurant.address.street ?? undefined,
            number: restaurant.address.number ?? undefined,
            neighborhood: restaurant.address.neighborhood ?? undefined,
            city: restaurant.address.city ?? undefined,
            state: restaurant.address.state ?? undefined,
            zipCode: restaurant.address.zipCode ?? undefined,
            latitude: restaurant.address.latitude?.toString(),
            longitude: restaurant.address.longitude?.toString(),
          }
        : undefined,
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
