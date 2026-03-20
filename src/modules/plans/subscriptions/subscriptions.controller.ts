import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
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
import { User } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  CreateSubscriptionResponseDto,
  ResponseFindAllSubscriptionsDto,
  ResponseSubscriptionDto,
} from './dto/response-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Assinaturas')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Rota para criar uma assinatura e registrar o pagamento inicial.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateSubscriptionResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
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

  @Get('current')
  @ApiOperation({
    summary: 'Rota para recuperar a assinatura ativa atual do usuário.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseSubscriptionDto })
  async findCurrent(@CurrentUser() user: User): Promise<ResponseSubscriptionDto> {
    return this.subscriptionsService.findCurrent(user);
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
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseSubscriptionDto })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseSubscriptionDto> {
    return this.subscriptionsService.cancel(user, id);
  }
}
