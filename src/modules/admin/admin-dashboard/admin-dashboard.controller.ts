import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import handleAccessControl from '@utils/HandleAccessControl';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AdminDashboardService } from './admin-dashboard.service';
import { ResponseDashboardCardsDto } from './dto/response-dashboard-cards.dto';
import { ResponseDashboardChartDto } from './dto/response-dashboard-chart.dto';

@ApiTags('Dashboard - Portal Gerencial')
@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(private readonly _adminDashboardService: AdminDashboardService) { }

  @Get('cards')
  @ApiOperation({
    summary: 'Retorna os totais dos cards do dashboard gerencial.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseDashboardCardsDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async getCards(@CurrentUser() user: User): Promise<ResponseDashboardCardsDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Dashboard');
    return this._adminDashboardService.getCards();
  }

  @Get('chart')
  @ApiOperation({
    summary: 'Retorna os dados mensais de usuários e serviços para o gráfico do dashboard.',
    security: [{ bearerAuth: [] }],
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Ano de referência (padrão: ano atual).',
  })
  @ApiOkResponse({ type: ResponseDashboardChartDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async getChart(
    @CurrentUser() user: User,
    @Query('year') year?: string,
  ): Promise<ResponseDashboardChartDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Dashboard');
    return this._adminDashboardService.getChart(year ? Number(year) : undefined);
  }
}
