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
import { CancelWorkDto } from './dto/cancel-work.dto';
import { CreateWorkResponseDto } from './dto/create-work-response.dto';
import { CreateWorkDto } from './dto/create-work.dto';
import { FinishWorkDto } from './dto/finish-work.dto';
import { QueryWorkDto } from './dto/query-work.dto';
import { ResponseFindAllWorkDto } from './dto/response-find-all-work.dto';
import { ResponseWorkDto } from './dto/response-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { WorksService } from './works.service';

@ApiTags('Trabalhos')
@Controller('works')
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  @Post()
  @ApiOperation({
    summary: 'Rota para cadastrar um novo trabalho.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateWorkResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateWorkDto,
  ): Promise<CreateWorkResponseDto> {
    return this.worksService.create(user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Rota para listar trabalhos do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllWorkDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryWorkDto,
  ): Promise<ResponseFindAllWorkDto> {
    return this.worksService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar um trabalho pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseWorkDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseWorkDto> {
    return this.worksService.findById(user, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rota para editar um trabalho pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseWorkDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateWorkDto,
  ): Promise<ResponseWorkDto> {
    return this.worksService.update(user, id, payload);
  }

  @Patch(':id/start')
  @ApiOperation({
    summary: 'Rota para iniciar um trabalho.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseWorkDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async start(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseWorkDto> {
    return this.worksService.start(user, id);
  }

  @Patch(':id/finish')
  @ApiOperation({
    summary: 'Rota para finalizar um trabalho.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseWorkDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async finish(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: FinishWorkDto,
  ): Promise<ResponseWorkDto> {
    return this.worksService.finish(user, id, payload);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Rota para cancelar um trabalho.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseWorkDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CancelWorkDto,
  ): Promise<ResponseWorkDto> {
    return this.worksService.cancel(user, id, payload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Rota para deletar um trabalho pelo id.',
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
    return this.worksService.delete(user, id);
  }
}
