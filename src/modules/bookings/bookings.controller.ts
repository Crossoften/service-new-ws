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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RespondBookingDto } from './dto/respond-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import {
  CreateBookingResponseDto,
  ResponseFindAllBookingDto,
  ResponseBookingDto,
} from './dto/response-booking.dto';

@ApiTags('Hospedagens - Reservas')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({
    summary: 'Rota para solicitar uma reserva de hospedagem.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateBookingResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateBookingDto,
  ): Promise<CreateBookingResponseDto> {
    return this.bookingsService.create(user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Rota para listar as reservas do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllBookingDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryBookingDto,
  ): Promise<ResponseFindAllBookingDto> {
    return this.bookingsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar uma reserva pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBookingDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBookingDto> {
    return this.bookingsService.findById(user, id);
  }

  @Patch(':id/respond')
  @ApiOperation({
    summary: 'Rota para o anfitrião confirmar ou rejeitar uma solicitação de reserva.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBookingDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async respond(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RespondBookingDto,
  ): Promise<ResponseBookingDto> {
    return this.bookingsService.respond(user, id, payload);
  }

  @Patch(':id/check-in')
  @ApiOperation({
    summary: 'Rota para o anfitrião registrar o check-in do hóspede.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBookingDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async checkIn(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBookingDto> {
    return this.bookingsService.checkIn(user, id);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Rota para o anfitrião concluir uma reserva.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBookingDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async complete(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBookingDto> {
    return this.bookingsService.complete(user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Rota para cancelar uma reserva ainda não concluída.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBookingDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CancelBookingDto,
  ): Promise<ResponseBookingDto> {
    return this.bookingsService.cancel(user, id, payload);
  }
}
