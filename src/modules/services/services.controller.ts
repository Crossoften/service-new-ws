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
import { UserProfileType } from '@prisma/client';
import { ProfileTypes } from '../auth/decorators/profile-types.decorator';
import { CreateServiceResponseDto } from './dto/create-service-response.dto';
import { CreateServiceReviewDto } from './dto/create-service-review.dto';
import { CreateServiceReviewResponseDto } from './dto/create-service-review-response.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { ResponseFindAllServiceDto } from './dto/response-find-all-service.dto';
import { ResponseServiceCategoryDto } from './dto/response-service-category.dto';
import { ResponseServiceDto } from './dto/response-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('Serviços')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para cadastrar um novo serviço.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateServiceResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateServiceDto,
  ): Promise<CreateServiceResponseDto> {
    return this.servicesService.create(user, payload);
  }

  @IsPublic()
  @Get('categories')
  @ApiOperation({ summary: 'Rota para listar categorias de serviços ativas.' })
  @ApiOkResponse({ type: [ResponseServiceCategoryDto] })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAllCategories(): Promise<ResponseServiceCategoryDto[]> {
    return this.servicesService.findAllCategories();
  }

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'Rota para listar serviços ativos.' })
  @ApiOkResponse({ type: ResponseFindAllServiceDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(@Query() query: QueryServiceDto): Promise<ResponseFindAllServiceDto> {
    return this.servicesService.findAll(query);
  }

  @Get('my-services')
  @ApiOperation({
    summary: 'Rota para listar os serviços do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllServiceDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMyServices(
    @CurrentUser() user: User,
    @Query() query: QueryServiceDto,
  ): Promise<ResponseFindAllServiceDto> {
    return this.servicesService.findMyServices(user, query);
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Rota para recuperar um serviço ativo pelo id.' })
  @ApiOkResponse({ type: ResponseServiceDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ResponseServiceDto> {
    return this.servicesService.findPublicById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rota para editar um serviço pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseServiceDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateServiceDto,
  ): Promise<ResponseServiceDto> {
    return this.servicesService.update(user, id, payload);
  }

  @Post(':id/reviews')
  @ApiOperation({
    summary: 'Rota para registrar ou atualizar a avaliação de um serviço.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateServiceReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async review(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CreateServiceReviewDto,
  ): Promise<CreateServiceReviewResponseDto> {
    return this.servicesService.review(user, id, payload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Rota para deletar um serviço pelo id.',
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
    return this.servicesService.delete(user, id);
  }
}
