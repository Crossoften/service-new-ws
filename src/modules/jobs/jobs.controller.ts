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
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobDto } from './dto/query-job.dto';
import { ApplyJobDto } from './dto/apply-job.dto';
import { RespondJobApplicationDto } from './dto/respond-job-application.dto';
import { QueryJobApplicationDto } from './dto/query-job-application.dto';
import {
  CreateJobResponseDto,
  ResponseFindAllJobDto,
  ResponseJobDto,
} from './dto/response-job.dto';
import {
  CreateJobApplicationResponseDto,
  ResponseFindAllJobApplicationDto,
  ResponseJobApplicationDto,
} from './dto/response-job-application.dto';

@ApiTags('Empregos')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o empregador publicar uma vaga de emprego.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateJobResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateJobDto,
  ): Promise<CreateJobResponseDto> {
    return this.jobsService.create(user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Rota para listar vagas de emprego ativas ou as vagas do empregador autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllJobDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryJobDto,
  ): Promise<ResponseFindAllJobDto> {
    return this.jobsService.findAll(user, query);
  }

  @Get('applications/me')
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({
    summary: 'Rota para o candidato listar suas candidaturas.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllJobApplicationDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMyApplications(
    @CurrentUser() user: User,
    @Query() query: QueryJobApplicationDto,
  ): Promise<ResponseFindAllJobApplicationDto> {
    return this.jobsService.findMyApplications(user, query);
  }

  @Get('applications/:id')
  @ApiOperation({
    summary: 'Rota para recuperar uma candidatura pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseJobApplicationDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findApplicationById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseJobApplicationDto> {
    return this.jobsService.findApplicationById(user, id);
  }

  @Patch('applications/:id/respond')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o empregador aceitar ou rejeitar uma candidatura.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseJobApplicationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async respondApplication(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: RespondJobApplicationDto,
  ): Promise<ResponseJobApplicationDto> {
    return this.jobsService.respondApplication(user, id, payload);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota para recuperar uma vaga de emprego pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseJobDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseJobDto> {
    return this.jobsService.findById(user, id);
  }

  @Patch(':id')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o empregador atualizar uma vaga de emprego.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseJobDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateJobDto,
  ): Promise<ResponseJobDto> {
    return this.jobsService.update(user, id, payload);
  }

  @Get(':id/applications')
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para o empregador listar as candidaturas recebidas em uma vaga.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllJobApplicationDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findJobApplications(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryJobApplicationDto,
  ): Promise<ResponseFindAllJobApplicationDto> {
    return this.jobsService.findJobApplications(user, id, query);
  }

  @Post(':id/apply')
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({
    summary: 'Rota para o candidato se candidatar a uma vaga de emprego.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateJobApplicationResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async apply(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: ApplyJobDto,
  ): Promise<CreateJobApplicationResponseDto> {
    return this.jobsService.apply(user, id, payload);
  }
}
