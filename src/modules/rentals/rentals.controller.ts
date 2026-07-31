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
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { RespondRentalDto } from './dto/respond-rental.dto';
import { CancelRentalDto } from './dto/cancel-rental.dto';
import { QueryRentalDto } from './dto/query-rental.dto';
import {
  CreateRentalResponseDto,
  ResponseFindAllRentalDto,
  ResponseRentalDto,
} from './dto/response-rental.dto';

@ApiTags('Aluguéis')
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post()
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({
    summary: 'Rota para solicitar o aluguel de um produto.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateRentalResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateRentalDto,
  ): Promise<CreateRentalResponseDto> {
    return this.rentalsService.create(user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Rota para listar os alugueis do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllRentalDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryRentalDto,
  ): Promise<ResponseFindAllRentalDto> {
    return this.rentalsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar um aluguel pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRentalDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseRentalDto> {
    return this.rentalsService.findById(user, id);
  }

  @Patch(':id/respond')
  @ApiOperation({
    summary: 'Rota para o locador aceitar ou rejeitar uma solicitação de aluguel.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRentalDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async respond(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RespondRentalDto,
  ): Promise<ResponseRentalDto> {
    return this.rentalsService.respond(user, id, payload);
  }

  @Patch(':id/start')
  @ApiOperation({
    summary: 'Rota para o locador marcar o aluguel como iniciado (retirada do item).',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRentalDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async start(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseRentalDto> {
    return this.rentalsService.start(user, id);
  }

  @Patch(':id/return')
  @ApiOperation({
    summary: 'Rota para o locador marcar o aluguel como devolvido.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRentalDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async return(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseRentalDto> {
    return this.rentalsService.return_(user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Rota para cancelar um aluguel ainda não devolvido.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseRentalDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CancelRentalDto,
  ): Promise<ResponseRentalDto> {
    return this.rentalsService.cancel(user, id, payload);
  }
}
