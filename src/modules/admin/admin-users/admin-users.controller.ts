import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
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

@ApiTags('Usuarios - Portal Gerencial')
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly _adminUsersService: AdminUsersService) {}

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
    console.log("Usuario recebido aqui:",user);
    handleAccessControl.verifyAdminRole(user);

    handleAccessControl.verifyPermission(user, 'Users');

    return this._adminUsersService.findById(id);
  }
}
