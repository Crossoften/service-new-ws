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
import { AdminInfluencersService } from './admin-influencers.service';
import { QueryAdminInfluencerDto } from './dto/query-admin-influencer.dto';
import { ResponseAdminInfluencerDto } from './dto/response-admin-influencer.dto';
import { ResponseFindAllAdminInfluencerDto } from './dto/response-admin-influencer-list.dto';

@ApiTags('Influencers - Portal Gerencial')
@Controller('admin-influencers')
export class AdminInfluencersController {
  constructor(private readonly _adminInfluencersService: AdminInfluencersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista paginada de influencers com filtros.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllAdminInfluencerDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryAdminInfluencerDto,
  ): Promise<ResponseFindAllAdminInfluencerDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminInfluencersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retorna os detalhes e estatísticas de um influencer pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAdminInfluencerDto })
  @ApiNotFoundResponse({ description: 'Influencer não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseAdminInfluencerDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminInfluencersService.findById(id);
  }
}
