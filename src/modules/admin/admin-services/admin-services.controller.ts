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
import { AdminServicesService } from './admin-services.service';
import { QueryAdminServiceClientsDto } from './dto/query-admin-service-clients.dto';
import { QueryAdminServiceDto } from './dto/query-admin-service.dto';
import { ResponseAdminServiceClientsDto } from './dto/response-admin-service-clients.dto';
import { ResponseAdminServiceDto } from './dto/response-admin-service.dto';
import { ResponseFindAllAdminServiceDto } from './dto/response-admin-service-list.dto';
import { ResponseProviderPercentageDto } from './dto/response-provider-percentage.dto';
import { QueryProviderPercentageDto } from './dto/query-provider-percentage.dto';

@ApiTags('Serviços - Portal Gerencial')
@Controller('admin-services')
export class AdminServicesController {
  constructor(private readonly _adminServicesService: AdminServicesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista paginada de serviços com filtros.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllAdminServiceDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryAdminServiceDto,
  ): Promise<ResponseFindAllAdminServiceDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Services');
    return this._adminServicesService.findAll(query);
  }

  @Get('/receipt-by-category')
  @ApiOperation({
    summary: 'Listar porcentagem de recebimento do fornecedor por categoria de serviço.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseProviderPercentageDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async listPercentageByCategory(
    @CurrentUser() user: User,
    @Query() query: QueryProviderPercentageDto,
  ): Promise<ResponseProviderPercentageDto[]> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminServicesService.listPercentageProvidersByCategory(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retorna os detalhes de um serviço pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAdminServiceDto })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseAdminServiceDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Services');
    return this._adminServicesService.findById(id);
  }

  @Get(':id/clients')
  @ApiOperation({
    summary: 'Lista paginada de clientes (works) de um serviço.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAdminServiceClientsDto })
  @ApiNotFoundResponse({ description: 'Serviço não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findClients(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryAdminServiceClientsDto,
  ): Promise<ResponseAdminServiceClientsDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Services');
    return this._adminServicesService.findClients(id, query);
  }

  @Get('ranking/purchases-by-location')
  @ApiOperation({
    summary: 'Ranking de cidades/estados onde mais se comprou serviço.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({
    description: 'Ranking geográfico de compras de serviço, pela cidade do cliente.',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async purchasesRankingByLocation(
    @CurrentUser() user: User,
    @Query('state') state?: string,
    @Query('city') city?: string,
  ) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminServicesService.getPurchaseRankingByLocation(state, city);
  }
}
