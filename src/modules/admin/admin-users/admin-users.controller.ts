import { Controller, Get, Patch, Param, ParseIntPipe, Query, Body } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { AdminUsersService } from './admin-users.service';
import { QueryAdminUserDto } from './dto/query-admin-user.dto';
import { ResponseAdminUserDto } from './dto/response-admin-user.dto';
import { ResponseFindAllAdminUserDto } from './dto/response-find-all-admin-user.dto';
import { UpdateUserDto } from './dto/update-user';
import { ResponseFindAllReferralsDto } from './dto/response-all-referrals.dto';

@ApiTags('Usuarios - Portal Gerencial')
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly _adminUsersService: AdminUsersService) { }

  @Get()
  @ApiOperation({
    summary: 'Rota que lista os usuários cadastrados no portal gerencial.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllAdminUserDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryAdminUserDto,
  ): Promise<ResponseFindAllAdminUserDto> {
    handleAccessControl.verifyAdminRole(user);

    handleAccessControl.verifyPermission(user, 'Users');

    return this._adminUsersService.findAll(query);
  }

  @Get('referrals')
  @ApiOperation({
    summary: 'Rota que lista todos os usuários indicados e quem os indicou (Visão Global)',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllReferralsDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAllReferrals(
    @CurrentUser() user: User,
  ) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');

    return this._adminUsersService.findAllReferrals();
  }


  @Get("/actives")
  @ApiOperation({
    summary: 'Rota que lista apenas os usuários ativos cadastrados no portal gerencial.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllAdminUserDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAllActiveUsers(
    @CurrentUser() user: User,
    @Query() query: QueryAdminUserDto,
  ): Promise<ResponseFindAllAdminUserDto> {
    handleAccessControl.verifyAdminRole(user);

    handleAccessControl.verifyPermission(user, 'Users');

    return this._adminUsersService.findAll({ ...query, status: 'Active' });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Rota que recupera os detalhes de um usuário pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAdminUserDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseAdminUserDto> {
    handleAccessControl.verifyAdminRole(user);

    handleAccessControl.verifyPermission(user, 'Users');

    return this._adminUsersService.findById(id);
  }

  @Patch(':id')
  @ApiTags('Atualizar informações do perfil do usuário')
  @ApiOperation({
    summary: 'Rota para administradores atualizarem qualquer informação do usuário.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ description: 'Perfil atualizado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  update(@Param('id', ParseIntPipe) UserId: number,
    @CurrentUser() adminUser: User,
    @Body() body: UpdateUserDto): Promise<ResponseAdminUserDto> {
    handleAccessControl.verifyAdminRole(adminUser);
    handleAccessControl.verifyPermission(adminUser, 'Users');
    return this._adminUsersService.update(UserId, body);
  }

  @Patch(':id/status-active')
  @ApiOperation({
    summary: 'Alterna o status do usuário entre Active e Inactive.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAdminUserDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseAdminUserDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminUsersService.updateStatus(id);
  }
}
