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
import { BudgetsService } from './budgets.service';
import { CreateBudgetResponseDto } from './dto/create-budget-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { QueryBudgetDto } from './dto/query-budget.dto';
import { RequestBudgetExtraDto } from './dto/request-budget-extra.dto';
import { RequestBudgetInformationDto } from './dto/request-budget-information.dto';
import { RespondBudgetExtraDto } from './dto/respond-budget-extra.dto';
import { ResponseFindAllBudgetDto } from './dto/response-find-all-budget.dto';
import { ResponseBudgetDto } from './dto/response-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateWorkResponseDto } from '../works/dto/create-work-response.dto';

@ApiTags('Orçamentos')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({
    summary: 'Rota para cadastrar um novo orçamento.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateBudgetResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateBudgetDto,
  ): Promise<CreateBudgetResponseDto> {
    return this.budgetsService.create(user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Rota para listar orçamentos do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllBudgetDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryBudgetDto,
  ): Promise<ResponseFindAllBudgetDto> {
    return this.budgetsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar um orçamento pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBudgetDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBudgetDto> {
    return this.budgetsService.findById(user, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rota para editar um orçamento pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBudgetDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateBudgetDto,
  ): Promise<ResponseBudgetDto> {
    return this.budgetsService.update(user, id, payload);
  }

  @Patch(':id/request-more-information')
  @ApiOperation({
    summary: 'Rota para pedir mais informações em um orçamento.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBudgetDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async requestMoreInformation(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RequestBudgetInformationDto,
  ): Promise<ResponseBudgetDto> {
    return this.budgetsService.requestMoreInformation(user, id, payload);
  }

  @Patch(':id/request-extra')
  @ApiOperation({
    summary: 'Rota para o fornecedor solicitar acréscimo em um orçamento.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBudgetDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async requestExtra(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RequestBudgetExtraDto,
  ): Promise<ResponseBudgetDto> {
    return this.budgetsService.requestExtra(user, id, payload);
  }

  @Patch(':id/respond-extra')
  @ApiOperation({
    summary: 'Rota para o cliente responder ao acréscimo de um orçamento.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBudgetDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async respondExtra(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RespondBudgetExtraDto,
  ): Promise<ResponseBudgetDto> {
    return this.budgetsService.respondExtra(user, id, payload);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Rota para aprovar um orçamento respondido e gerar a solicitação do serviço.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: CreateWorkResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async approve(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CreateWorkResponseDto> {
    return this.budgetsService.approve(user, id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Rota para deletar um orçamento pelo id.',
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
    return this.budgetsService.delete(user, id);
  }
}
