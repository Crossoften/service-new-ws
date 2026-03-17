import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResponseBalanceOverviewDto } from './dto/response-balance-overview.dto';
import { ResponseBalanceReceiptsDto } from './dto/response-balance-receipts.dto';
import { BalancesService } from './balances.service';

@ApiTags('Saldo')
@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Rota para recuperar o saldo do mês e os últimos orçamentos recebidos pelo fornecedor.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBalanceOverviewDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findOverview(@CurrentUser() user: User): Promise<ResponseBalanceOverviewDto> {
    return this.balancesService.findOverview(user);
  }

  @Get('receipts')
  @ApiOperation({
    summary: 'Rota para recuperar o saldo do mês e os últimos recebimentos do fornecedor.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBalanceReceiptsDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findReceipts(@CurrentUser() user: User): Promise<ResponseBalanceReceiptsDto> {
    return this.balancesService.findReceipts(user);
  }
}
