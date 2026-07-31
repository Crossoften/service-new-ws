import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User, UserProfileType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileTypes } from '../auth/decorators/profile-types.decorator';
import { RestaurantsService } from './restaurants.service';
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

@ApiTags('Restaurantes')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Rota para listar as categorias de restaurante ativas.' })
  @ApiOkResponse({ type: [ResponseRestaurantCategoryDto] })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async listCategories(): Promise<ResponseRestaurantCategoryDto[]> {
    return this.restaurantsService.listCategories();
  }

  @Get('me')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor recuperar o seu restaurante com o cardápio completo.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRestaurantDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMine(@CurrentUser() user: User): Promise<ResponseRestaurantDto> {
    return this.restaurantsService.findMine(user);
  }

  @Get('me/payouts')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor consultar o relatório de repasse de comissão do delivery.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRestaurantPayoutDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMyPayouts(@CurrentUser() user: User): Promise<ResponseRestaurantPayoutDto> {
    return this.restaurantsService.findMyPayouts(user);
  }

  @Post()
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor cadastrar o seu restaurante.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateRestaurantResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateRestaurantDto,
  ): Promise<CreateRestaurantResponseDto> {
    return this.restaurantsService.create(user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Rota para listar os restaurantes ativos.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllRestaurantDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(@Query() query: QueryRestaurantDto): Promise<ResponseFindAllRestaurantDto> {
    return this.restaurantsService.findAll(query);
  }

  @Patch('menu-categories/:id')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor atualizar uma categoria do cardápio.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseMenuCategoryDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateMenuCategory(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateMenuCategoryDto,
  ): Promise<ResponseMenuCategoryDto> {
    return this.restaurantsService.updateMenuCategory(user, id, payload);
  }

  @Post('menu-categories')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor criar uma categoria do cardápio.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: ResponseMenuCategoryDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async createMenuCategory(
    @CurrentUser() user: User,
    @Body() payload: CreateMenuCategoryDto,
  ): Promise<ResponseMenuCategoryDto> {
    return this.restaurantsService.createMenuCategory(user, payload);
  }

  @Post('menu-items')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor criar um item de cardápio.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ description: 'Item de cardápio criado.' })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async createMenuItem(@CurrentUser() user: User, @Body() payload: CreateMenuItemDto) {
    return this.restaurantsService.createMenuItem(user, payload);
  }

  @Patch('menu-items/:id')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor atualizar um item de cardápio.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ description: 'Item de cardápio atualizado.' })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateMenuItem(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateMenuItemDto,
  ) {
    return this.restaurantsService.updateMenuItem(user, id, payload);
  }

  @Post('menu-items/:id/additions')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor criar um adicional para um item de cardápio.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ description: 'Adicional criado.' })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async createMenuItemAddition(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CreateMenuItemAdditionDto,
  ) {
    return this.restaurantsService.createMenuItemAddition(user, id, payload);
  }

  @Patch('menu-item-additions/:id')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor atualizar um adicional de item de cardápio.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ description: 'Adicional atualizado.' })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateMenuItemAddition(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateMenuItemAdditionDto,
  ) {
    return this.restaurantsService.updateMenuItemAddition(user, id, payload);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar um restaurante com o cardápio completo pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRestaurantDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ResponseRestaurantDto> {
    return this.restaurantsService.findById(id);
  }

  @Patch(':id')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o fornecedor atualizar o seu restaurante.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRestaurantDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateRestaurantDto,
  ): Promise<ResponseRestaurantDto> {
    return this.restaurantsService.update(user, id, payload);
  }
}
