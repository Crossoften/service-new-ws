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
import { TransportRequestsService } from './transport-requests.service';
import { CreateTransportRequestDto } from './dto/create-transport-request.dto';
import { QuoteTransportRequestDto } from './dto/quote-transport-request.dto';
import { RespondTransportRequestDto } from './dto/respond-transport-request.dto';
import { CancelTransportRequestDto } from './dto/cancel-transport-request.dto';
import { QueryTransportRequestDto } from './dto/query-transport-request.dto';
import {
  CreateTransportRequestResponseDto,
  ResponseFindAllTransportRequestDto,
  ResponseTransportRequestDto,
} from './dto/response-transport-request.dto';

@ApiTags('Transporte')
@Controller('transport-requests')
export class TransportRequestsController {
  constructor(private readonly transportRequestsService: TransportRequestsService) {}

  @Post()
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({
    summary: 'Rota para solicitar um transporte.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateTransportRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateTransportRequestDto,
  ): Promise<CreateTransportRequestResponseDto> {
    return this.transportRequestsService.create(user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Rota para listar os pedidos de transporte do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllTransportRequestDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryTransportRequestDto,
  ): Promise<ResponseFindAllTransportRequestDto> {
    return this.transportRequestsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar um pedido de transporte pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseTransportRequestDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseTransportRequestDto> {
    return this.transportRequestsService.findById(user, id);
  }

  @Patch(':id/quote')
  @ApiOperation({
    summary: 'Rota para o transportador cotar um pedido de transporte.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseTransportRequestDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async quote(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: QuoteTransportRequestDto,
  ): Promise<ResponseTransportRequestDto> {
    return this.transportRequestsService.quote(user, id, payload);
  }

  @Patch(':id/respond')
  @ApiOperation({
    summary: 'Rota para o solicitante aceitar ou rejeitar a cotação do transporte.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseTransportRequestDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async respond(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RespondTransportRequestDto,
  ): Promise<ResponseTransportRequestDto> {
    return this.transportRequestsService.respond(user, id, payload);
  }

  @Patch(':id/start')
  @ApiOperation({
    summary: 'Rota para o transportador iniciar o transporte (em trânsito).',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseTransportRequestDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async start(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseTransportRequestDto> {
    return this.transportRequestsService.start(user, id);
  }

  @Patch(':id/deliver')
  @ApiOperation({
    summary: 'Rota para o transportador marcar a carga como entregue.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseTransportRequestDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async deliver(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseTransportRequestDto> {
    return this.transportRequestsService.deliver(user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Rota para cancelar um pedido de transporte ainda não entregue.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseTransportRequestDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CancelTransportRequestDto,
  ): Promise<ResponseTransportRequestDto> {
    return this.transportRequestsService.cancel(user, id, payload);
  }
}
