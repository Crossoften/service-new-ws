import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import handleAccessControl from '@utils/HandleAccessControl';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AdminProvidersService } from './admin-providers.service';
import { QueryAdminProviderHistoryDto } from './dto/query-admin-provider-history.dto';
import { QueryAdminProviderDto } from './dto/query-admin-provider.dto';
import { ResponseAdminProviderHistoryDto } from './dto/response-admin-provider-history.dto';
import { ResponseAdminProviderDto } from './dto/response-admin-provider.dto';
import { ResponseFindAllAdminProviderDto } from './dto/response-admin-provider-list.dto';

@ApiTags('Fornecedores - Portal Gerencial')
@Controller('admin-providers')
export class AdminProvidersController {
  constructor(private readonly _adminProvidersService: AdminProvidersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista paginada de fornecedores com filtros.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllAdminProviderDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryAdminProviderDto,
  ): Promise<ResponseFindAllAdminProviderDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminProvidersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retorna os detalhes de um fornecedor pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAdminProviderDto })
  @ApiNotFoundResponse({ description: 'Fornecedor não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseAdminProviderDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminProvidersService.findById(id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Lista paginada do histórico de serviços executados pelo fornecedor.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAdminProviderHistoryDto })
  @ApiNotFoundResponse({ description: 'Fornecedor não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findHistory(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryAdminProviderHistoryDto,
  ): Promise<ResponseAdminProviderHistoryDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminProvidersService.findHistory(id, query);
  }
}
