import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { CreateTransportationResponseDto } from './dto/create-transportation-response.dto';
import { CreateTransportationDto } from './dto/create-transportation.dto';
import { QueryTransportationDto } from './dto/query-transportation.dto';
import { ResponseFindAllTransportationDto } from './dto/response-find-all-transportation.dto';
import { ResponseTransportationCategoryDto } from './dto/response-transportation-category.dto';
import { ResponseTransportationDto } from './dto/response-transportation.dto';
import { UpdateTransportationDto } from './dto/update-transportation.dto';
import { TransportationsService } from './transportations.service';

@ApiTags('Transportes')
@Controller('transportations')
export class TransportationsController {
  constructor(private readonly transportationsService: TransportationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Rota para cadastrar um novo transporte.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateTransportationResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateTransportationDto,
  ): Promise<CreateTransportationResponseDto> {
    return this.transportationsService.create(user, payload);
  }

  @IsPublic()
  @Get('categories')
  @ApiOperation({ summary: 'Rota para listar categorias de transportes ativas.' })
  @ApiOkResponse({ type: [ResponseTransportationCategoryDto] })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAllCategories(): Promise<ResponseTransportationCategoryDto[]> {
    return this.transportationsService.findAllCategories();
  }

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'Rota para listar transportes ativos.' })
  @ApiOkResponse({ type: ResponseFindAllTransportationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(@Query() query: QueryTransportationDto): Promise<ResponseFindAllTransportationDto> {
    return this.transportationsService.findAll(query);
  }

  @Get('my-transportations')
  @ApiOperation({
    summary: 'Rota para listar os transportes do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllTransportationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMyTransportations(
    @CurrentUser() user: User,
    @Query() query: QueryTransportationDto,
  ): Promise<ResponseFindAllTransportationDto> {
    return this.transportationsService.findMyTransportations(user, query);
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Rota para recuperar um transporte ativo pelo id.' })
  @ApiOkResponse({ type: ResponseTransportationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ResponseTransportationDto> {
    return this.transportationsService.findPublicById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rota para editar um transporte pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseTransportationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateTransportationDto,
  ): Promise<ResponseTransportationDto> {
    return this.transportationsService.update(user, id, payload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Rota para deletar um transporte pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ImessageEntity> {
    return this.transportationsService.delete(user, id);
  }
}
