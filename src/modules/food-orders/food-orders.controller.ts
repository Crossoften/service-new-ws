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
import { UserProfileType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileTypes } from '../auth/decorators/profile-types.decorator';
import { FoodOrdersService } from './food-orders.service';
import { CreateFoodOrderDto } from './dto/create-food-order.dto';
import { RespondFoodOrderDto } from './dto/respond-food-order.dto';
import { CancelFoodOrderDto } from './dto/cancel-food-order.dto';
import { QueryFoodOrderDto } from './dto/query-food-order.dto';
import {
  CreateFoodOrderResponseDto,
  ResponseFindAllFoodOrderDto,
  ResponseFoodOrderDto,
} from './dto/response-food-order.dto';

@ApiTags('Pedidos de Delivery')
@ApiBadRequestResponse({ description: 'Dados inválidos.' })
@ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor.' })
@Controller('food-orders')
export class FoodOrdersController {
  constructor(private readonly foodOrdersService: FoodOrdersService) {}

  @Post()
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({ summary: 'Realiza um pedido de delivery em um restaurante.' })
  @ApiCreatedResponse({ type: CreateFoodOrderResponseDto })
  @ApiForbiddenResponse({ description: 'Apenas clientes podem realizar pedidos.' })
  create(@CurrentUser() user, @Body() payload: CreateFoodOrderDto) {
    return this.foodOrdersService.create(user, payload);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os pedidos do usuário logado (cliente ou restaurante).' })
  @ApiOkResponse({ type: ResponseFindAllFoodOrderDto })
  findAll(@CurrentUser() user, @Query() query: QueryFoodOrderDto) {
    return this.foodOrdersService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um pedido de delivery pelo id.' })
  @ApiOkResponse({ type: ResponseFoodOrderDto })
  @ApiForbiddenResponse({ description: 'Usuário não pode visualizar este pedido.' })
  findById(@CurrentUser() user, @Param('id', ParseIntPipe) id: number) {
    return this.foodOrdersService.findById(user, id);
  }

  @Patch(':id/respond')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({ summary: 'Restaurante aceita ou recusa um pedido recebido.' })
  @ApiOkResponse({ type: ResponseFoodOrderDto })
  @ApiForbiddenResponse({ description: 'Apenas o restaurante do pedido pode respondê-lo.' })
  respond(
    @CurrentUser() user,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RespondFoodOrderDto,
  ) {
    return this.foodOrdersService.respond(user, id, payload);
  }

  @Patch(':id/preparing')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({ summary: 'Restaurante marca o pedido como em preparo.' })
  @ApiOkResponse({ type: ResponseFoodOrderDto })
  @ApiForbiddenResponse({ description: 'Apenas o restaurante do pedido pode alterá-lo.' })
  markPreparing(@CurrentUser() user, @Param('id', ParseIntPipe) id: number) {
    return this.foodOrdersService.markPreparing(user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancela um pedido de delivery.' })
  @ApiOkResponse({ type: ResponseFoodOrderDto })
  @ApiForbiddenResponse({ description: 'Usuário não pode cancelar este pedido.' })
  cancel(
    @CurrentUser() user,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CancelFoodOrderDto,
  ) {
    return this.foodOrdersService.cancel(user, id, payload);
  }
}
