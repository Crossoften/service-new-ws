import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { PayFoodOrderDto } from './dto/pay-food-order.dto';
import { PayFoodOrderResponseDto } from './dto/pay-food-order-response.dto';

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
  @ApiConflictResponse({
    description: 'Fornecedor com assinatura vencida: não pode receber novos pedidos.',
  })
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
  @ApiOperation({
    summary: 'Restaurante aceita ou recusa um pedido recebido.',
    description:
      'Ao ser processada, notifica o cliente via WhatsApp sobre a decisão do restaurante.',
  })
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

  @Post(':id/pay')
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({
    summary: 'Gera o checkout de pagamento (Mercado Pago) de um pedido de delivery.',
    description:
      'Só vale para pedidos que não são em dinheiro — pedido em dinheiro é liquidado na ' +
      'entrega e responde 400. A confirmação do pagamento ocorre de forma assíncrona via ' +
      'webhook: esta rota apenas devolve a URL do checkout. Enquanto houver um checkout em ' +
      'aberto para o pedido, uma nova chamada responde 400; um pagamento recusado libera ' +
      'gerar outro.',
  })
  @ApiCreatedResponse({ type: PayFoodOrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'Pedido em dinheiro, já pago, cancelado, com checkout em aberto, ou restaurante sem ' +
      'conta do Mercado Pago vinculada.',
  })
  @ApiForbiddenResponse({ description: 'Apenas o cliente do pedido pode pagar.' })
  pay(
    @CurrentUser() user,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: PayFoodOrderDto,
  ) {
    return this.foodOrdersService.pay(user, id, payload);
  }

  @Patch(':id/confirm-payment')
  @ProfileTypes(UserProfileType.Delivery, UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Confirma o recebimento de um pedido pago em dinheiro.',
    description:
      'Só vale para pedidos com paymentMethod Cash — os demais meios são quitados pelo ' +
      'provedor de pagamento e respondem 400. Pode ser chamada pelo entregador designado ' +
      'ou, quando não há entrega atribuída, pelo dono do restaurante. Chamar de novo em um ' +
      'pedido já confirmado não é erro: a rota é idempotente.',
  })
  @ApiOkResponse({ type: ResponseFoodOrderDto })
  @ApiBadRequestResponse({ description: 'O pedido não é em dinheiro, ou está cancelado.' })
  @ApiForbiddenResponse({ description: 'Apenas quem entrega o pedido pode confirmar.' })
  confirmCashPayment(@CurrentUser() user, @Param('id', ParseIntPipe) id: number) {
    return this.foodOrdersService.confirmCashPayment(user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancela um pedido de delivery.',
    description: 'Ao ser processada, notifica a contraparte via WhatsApp sobre o cancelamento.',
  })
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
