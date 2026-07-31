import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
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
import { UpdateInfluencerCommissionDto } from './dto/update-influencer-commission.dto';
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

  @Patch(':id/commission')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Define ou remove a taxa de comissão exclusiva de um influencer.',
    description:
      'Envie commissionRate com valor para taxa customizada, ou null para usar a taxa global.',
    security: [{ bearerAuth: [] }],
  })
  @ApiNoContentResponse({ description: 'Comissão atualizada com sucesso.' })
  @ApiNotFoundResponse({ description: 'Influencer não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateCommission(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInfluencerCommissionDto,
  ): Promise<{ message: string; id: number }> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return await this._adminInfluencersService.updateCommission(id, body.commissionRate ?? null);
  }

  @Get(':id/referrals')
  @ApiOperation({
    summary: 'Lista os usuários indicados por um influencer específico.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ description: 'Lista de indicados do influencer.' })
  @ApiNotFoundResponse({ description: 'Influencer não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findReferralsById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminInfluencersService.findReferralsById(id);
  }

  @Get('ranking/location')
  @ApiOperation({
    summary: 'Ranking de influencers por cidade/estado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ description: 'Ranking geográfico de influencers por indicações.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async rankingByLocation(
    @CurrentUser() user: User,
    @Query('state') state?: string,
    @Query('city') city?: string,
  ) {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Users');
    return this._adminInfluencersService.getRankingByLocation(state, city);
  }
}
