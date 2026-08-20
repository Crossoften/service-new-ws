import { Controller, Get, Param, ParseIntPipe, Patch, Query, Body } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { DeliveriesService } from './deliveries.service';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { ResponseDeliveryDto, ResponseFindAllDeliveryDto } from './dto/response-delivery.dto';

@ApiTags('Entregas')
@ApiBadRequestResponse({ description: 'Dados inválidos.' })
@ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor.' })
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('available')
  @ProfileTypes(UserProfileType.Delivery)
  @ApiOperation({ summary: 'Lista as entregas disponíveis para aceite.' })
  @ApiOkResponse({ type: ResponseFindAllDeliveryDto })
  findAvailable(@Query() query: QueryDeliveryDto) {
    return this.deliveriesService.findAvailable(query);
  }

  @Get('me')
  @ProfileTypes(UserProfileType.Delivery)
  @ApiOperation({ summary: 'Lista as entregas do entregador logado.' })
  @ApiOkResponse({ type: ResponseFindAllDeliveryDto })
  findMine(@CurrentUser() user, @Query() query: QueryDeliveryDto) {
    return this.deliveriesService.findMine(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca uma entrega pelo id (entregador, restaurante ou cliente do pedido).',
  })
  @ApiOkResponse({ type: ResponseDeliveryDto })
  @ApiForbiddenResponse({ description: 'Usuário não pode visualizar esta entrega.' })
  findById(@CurrentUser() user, @Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.findById(user, id);
  }

  @Patch(':id/accept')
  @ProfileTypes(UserProfileType.Delivery)
  @ApiOperation({ summary: 'Entregador aceita uma entrega disponível.' })
  @ApiOkResponse({ type: ResponseDeliveryDto })
  accept(@CurrentUser() user, @Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.accept(user, id);
  }

  @Patch(':id/reject')
  @ProfileTypes(UserProfileType.Delivery)
  @ApiOperation({ summary: 'Entregador recusa uma entrega já aceita, devolvendo-a ao pool.' })
  @ApiOkResponse({ type: ResponseDeliveryDto })
  @ApiForbiddenResponse({ description: 'Apenas o entregador responsável pode recusar a entrega.' })
  reject(@CurrentUser() user, @Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.reject(user, id);
  }

  @Patch(':id/pickup')
  @ProfileTypes(UserProfileType.Delivery)
  @ApiOperation({
    summary: 'Entregador confirma a coleta do pedido no restaurante.',
    description:
      'Ao ser processada, notifica o cliente via WhatsApp que o pedido saiu para entrega.',
  })
  @ApiOkResponse({ type: ResponseDeliveryDto })
  @ApiForbiddenResponse({ description: 'Apenas o entregador responsável pode coletar o pedido.' })
  pickup(@CurrentUser() user, @Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.pickup(user, id);
  }

  @Patch(':id/location')
  @ProfileTypes(UserProfileType.Delivery)
  @ApiOperation({ summary: 'Entregador atualiza sua localização em tempo real.' })
  @ApiOkResponse({ type: ResponseDeliveryDto })
  @ApiForbiddenResponse({
    description: 'Apenas o entregador responsável pode atualizar a localização.',
  })
  updateLocation(
    @CurrentUser() user,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateDeliveryLocationDto,
  ) {
    return this.deliveriesService.updateLocation(user, id, payload);
  }

  @Patch(':id/deliver')
  @ProfileTypes(UserProfileType.Delivery)
  @ApiOperation({
    summary: 'Entregador confirma a entrega do pedido ao cliente.',
    description: 'Ao ser processada, notifica o cliente via WhatsApp que o pedido foi entregue.',
  })
  @ApiOkResponse({ type: ResponseDeliveryDto })
  @ApiForbiddenResponse({
    description: 'Apenas o entregador responsável pode finalizar a entrega.',
  })
  deliver(@CurrentUser() user, @Param('id', ParseIntPipe) id: number) {
    return this.deliveriesService.deliver(user, id);
  }
}
