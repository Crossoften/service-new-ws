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
import { AccommodationsService } from './accommodations.service';
import { CreateAccommodationReviewResponseDto } from './dto/create-accommodation-review-response.dto';
import { CreateAccommodationReviewDto } from './dto/create-accommodation-review.dto';
import { CreateAccommodationResponseDto } from './dto/create-accommodation-response.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { QueryAccommodationDto } from './dto/query-accommodation.dto';
import { ResponseAccommodationCategoryDto } from './dto/response-accommodation-category.dto';
import { ResponseAccommodationDto } from './dto/response-accommodation.dto';
import { ResponseFindAllAccommodationDto } from './dto/response-find-all-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';

@ApiTags('Hospedagens')
@Controller('accommodations')
export class AccommodationsController {
  constructor(private readonly accommodationsService: AccommodationsService) {}

  @Post()
  @ProfileTypes(UserProfileType.Supplier)
  @ApiOperation({
    summary: 'Rota para cadastrar uma nova hospedagem.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateAccommodationResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateAccommodationDto,
  ): Promise<CreateAccommodationResponseDto> {
    return this.accommodationsService.create(user, payload);
  }

  @IsPublic()
  @Get('categories')
  @ApiOperation({ summary: 'Rota para listar categorias de hospedagens ativas.' })
  @ApiOkResponse({ type: [ResponseAccommodationCategoryDto] })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAllCategories(): Promise<ResponseAccommodationCategoryDto[]> {
    return this.accommodationsService.findAllCategories();
  }

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'Rota para listar hospedagens ativas.' })
  @ApiOkResponse({ type: ResponseFindAllAccommodationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(@Query() query: QueryAccommodationDto): Promise<ResponseFindAllAccommodationDto> {
    return this.accommodationsService.findAll(query);
  }

  @Get('my-accommodations')
  @ApiOperation({
    summary: 'Rota para listar as hospedagens do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllAccommodationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMyAccommodations(
    @CurrentUser() user: User,
    @Query() query: QueryAccommodationDto,
  ): Promise<ResponseFindAllAccommodationDto> {
    return this.accommodationsService.findMyAccommodations(user, query);
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Rota para recuperar uma hospedagem ativa pelo id.' })
  @ApiOkResponse({ type: ResponseAccommodationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ResponseAccommodationDto> {
    return this.accommodationsService.findPublicById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rota para editar uma hospedagem pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAccommodationDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateAccommodationDto,
  ): Promise<ResponseAccommodationDto> {
    return this.accommodationsService.update(user, id, payload);
  }

  @Post(':id/reviews')
  @ApiOperation({
    summary: 'Rota para registrar ou atualizar a avaliação de uma hospedagem.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateAccommodationReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async review(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CreateAccommodationReviewDto,
  ): Promise<CreateAccommodationReviewResponseDto> {
    return this.accommodationsService.review(user, id, payload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Rota para deletar uma hospedagem pelo id.',
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
    return this.accommodationsService.delete(user, id);
  }
}
