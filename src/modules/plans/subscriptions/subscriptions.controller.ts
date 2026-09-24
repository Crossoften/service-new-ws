import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  CreateSubscriptionResponseDto,
  ResponseFindAllSubscriptionsDto,
  ResponseSubscriptionDto,
} from './dto/response-subscription.dto';
import { QueryCurrentSubscriptionDto } from './dto/query-current-subscription.dto';
import { ResponseSubscriptionCatalogDto } from './dto/response-subscription-catalog.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Assinaturas')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Rota para criar uma assinatura (pendente) e gerar o checkout de pagamento (Mercado Pago). A confirmação do pagamento ocorre de forma assíncrona via webhook.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateSubscriptionResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiServiceUnavailableResponse({
    description: 'Integração com Mercado Pago não configurada no servidor.',
  })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateSubscriptionDto,
  ): Promise<CreateSubscriptionResponseDto> {
    return this.subscriptionsService.create(user, payload);
  }

  @Get('my-subscriptions')
  @ApiOperation({
    summary: 'Rota para listar as assinaturas do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllSubscriptionsDto })
  async findMine(@CurrentUser() user: User): Promise<ResponseFindAllSubscriptionsDto> {
    return this.subscriptionsService.findMine(user);
  }

  // Declarada ANTES de `:id`: o Nest resolve na ordem de declaração, e depois
  // de `:id` esta rota nunca seria alcançada — `catalog` casaria como id.
  @Get('catalog')
  @ApiOperation({
    summary: 'Rota para listar categorias, planos e a situação do fornecedor em cada categoria.',
    description:
      'Monta a tela de contratação numa chamada. `isSubscribed` responde ' +
      'exatamente o que o portão responderia, incluindo a tolerância de 3 dias ' +
      'e a cobertura ampla das concessões administrativas.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseSubscriptionCatalogDto })
  async catalog(@CurrentUser() user: User): Promise<ResponseSubscriptionCatalogDto> {
    return this.subscriptionsService.catalog(user);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Rota para recuperar a assinatura atual do usuário.',
    description:
      'Com a cobrança por categoria o fornecedor tem várias assinaturas; use ' +
      '`categoryId` para escolher uma. Devolve também a vencida, para a tela ' +
      'conseguir oferecer a renovação — quem diz se ela vale são `expired` e ' +
      '`inGracePeriod`.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseSubscriptionDto })
  async findCurrent(
    @CurrentUser() user: User,
    @Query() query: QueryCurrentSubscriptionDto,
  ): Promise<ResponseSubscriptionDto> {
    return this.subscriptionsService.findCurrent(user, query.categoryId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar uma assinatura pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseSubscriptionDto })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseSubscriptionDto> {
    return this.subscriptionsService.findById(user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Rota para cancelar uma assinatura ativa.',
    description:
      'O cancelamento é agendado para o fim do período já pago: a assinatura ' +
      'segue valendo até `currentPeriodEnd` e não renova depois. Numa assinatura ' +
      'sem prazo, encerra na hora. Notifica o assinante via WhatsApp.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseSubscriptionDto })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseSubscriptionDto> {
    return this.subscriptionsService.cancel(user, id);
  }

  @Patch(':id/reactivate')
  @ApiOperation({
    summary: 'Rota para desfazer o cancelamento agendado de uma assinatura.',
    description:
      'Sem cobrança. Só vale enquanto o período pago não terminou — depois ' +
      'disso o caminho é renovar.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseSubscriptionDto })
  @ApiBadRequestResponse({ description: 'A assinatura não está com cancelamento agendado.' })
  async reactivate(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseSubscriptionDto> {
    return this.subscriptionsService.reactivate(user, id);
  }

  @Post(':id/renew')
  @ApiOperation({
    summary: 'Rota para renovar uma assinatura por mais um ciclo.',
    description:
      'Gera um novo checkout do Mercado Pago. Disponível a 7 dias do vencimento ' +
      '(`needsRenewal`) e durante a tolerância de 3 dias após vencer. O novo ' +
      'período emenda no atual, sem perder os dias já pagos.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateSubscriptionResponseDto })
  @ApiBadRequestResponse({ description: 'Renovação indisponível para esta assinatura.' })
  async renew(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CreateSubscriptionResponseDto> {
    return this.subscriptionsService.renew(user, id);
  }
}
