import { Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Body } from '@nestjs/common';
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
import { UserProfileType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileTypes } from '../auth/decorators/profile-types.decorator';
import { CreateCommercialTransactionDto } from './dto/create-commercial-transaction.dto';
import { PayCommercialTransactionDto } from './dto/pay-commercial-transaction.dto';
import { QueryCommercialTransactionDto } from './dto/query-commercial-transaction.dto';
import {
  CreateCommercialTransactionResponseDto,
  ResponseCommercialTransactionDto,
  ResponseFindAllCommercialTransactionDto,
} from './dto/response-commercial-transaction.dto';
import { RespondCommercialTransactionDto } from './dto/respond-commercial-transaction.dto';
import { CommercialTransactionsService } from './commercial-transactions.service';

@ApiTags('Negociações')
@Controller('commercial-transactions')
export class CommercialTransactionsController {
  constructor(private readonly commercialTransactionsService: CommercialTransactionsService) {}

  @Post()
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({
    summary: 'Rota para abrir uma nova negociação comercial.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateCommercialTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateCommercialTransactionDto,
  ): Promise<CreateCommercialTransactionResponseDto> {
    return this.commercialTransactionsService.create(user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Rota para listar negociações do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllCommercialTransactionDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryCommercialTransactionDto,
  ): Promise<ResponseFindAllCommercialTransactionDto> {
    return this.commercialTransactionsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar uma negociação pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCommercialTransactionDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseCommercialTransactionDto> {
    return this.commercialTransactionsService.findById(user, id);
  }

  @Patch(':id/respond')
  @ApiOperation({
    summary: 'Rota para o vendedor aceitar ou rejeitar uma negociação.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCommercialTransactionDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async respond(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RespondCommercialTransactionDto,
  ): Promise<ResponseCommercialTransactionDto> {
    return this.commercialTransactionsService.respond(user, id, payload);
  }

  @Post(':id/pay')
  @ApiOperation({
    summary: 'Rota para registrar o pagamento de uma negociação aceita.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: ResponseCommercialTransactionDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async pay(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: PayCommercialTransactionDto,
  ): Promise<ResponseCommercialTransactionDto> {
    return this.commercialTransactionsService.pay(user, id, payload);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Rota para concluir uma negociação paga.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCommercialTransactionDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async complete(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseCommercialTransactionDto> {
    return this.commercialTransactionsService.complete(user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Rota para cancelar uma negociação ainda não paga.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCommercialTransactionDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseCommercialTransactionDto> {
    return this.commercialTransactionsService.cancel(user, id);
  }
}
