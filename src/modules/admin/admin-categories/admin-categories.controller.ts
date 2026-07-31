import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
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
import handleAccessControl from '@utils/HandleAccessControl';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AdminCategoriesService } from './admin-categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdatePlatformFeeRateDto } from './dto/update-platformfeerate.dto';
import { ResponseCategoryDto } from './dto/response-create-category.dto';

@ApiTags('Edição de categorias')
@Controller('admin-categories')
export class AdminCategoriesController {
  constructor(private readonly _adminCategoriesService: AdminCategoriesService) {}

  @Post(':context')
  @ApiOperation({
    summary: 'Cria uma nova categoria.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: ResponseCategoryDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Param('context') context: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Settings');
    return this._adminCategoriesService.create(context, createCategoryDto);
  }

  @Patch(':context/:id')
  @ApiOperation({
    summary: 'Atualiza uma categoria existente.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCategoryDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('context') context: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Settings');
    return this._adminCategoriesService.update(context, id, updateCategoryDto);
  }

  @Get(':context')
  @ApiOperation({
    summary: 'Lista todas as categorias.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: [ResponseCategoryDto] })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(@CurrentUser() user: User, @Param('context') context: string) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Settings');
    return this._adminCategoriesService.findAll(context);
  }

  @Get(':context/:id')
  @ApiOperation({
    summary: 'Obtém uma categoria específica.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCategoryDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findOne(
    @CurrentUser() user: User,
    @Param('context') context: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Settings');
    return this._adminCategoriesService.findOne(context, id);
  }

  @Patch('services/:id/platform-fee-rate')
  @ApiOperation({
    summary: 'Atualiza a taxa de tarifa da plataforma para uma categoria de serviço específico.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCategoryDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updatePlatformFeeRate(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlatformFeeRateDto: UpdatePlatformFeeRateDto,
  ) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Settings');
    return this._adminCategoriesService.updatePlatformFeeRate(id, updatePlatformFeeRateDto);
  }

  @Patch(':context/:id/inactivate')
  @ApiOperation({
    summary: 'Inativa uma categoria específica.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCategoryDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async inactivate(
    @CurrentUser() user: User,
    @Param('context') context: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Settings');
    return this._adminCategoriesService.inactivate(context, id);
  }
}
