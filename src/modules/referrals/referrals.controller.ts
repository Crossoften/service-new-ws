import { Controller, Get } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User, UserProfileType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileTypes } from '../auth/decorators/profile-types.decorator';
import { ReferralsService } from './referrals.service';
import { ResponseMyReferralsDto } from './dto/response-my-referrals.dto';
import { ResponseMyReferralsSummaryDto } from './dto/response-my-referrals-summary.dto';

@ApiTags('Indicações')
@Controller('referrals')
@ProfileTypes(UserProfileType.Influencer)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Rota para listar os usuários indicados pelo influencer autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseMyReferralsDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMyReferrals(@CurrentUser() user: User): Promise<ResponseMyReferralsDto> {
    return this.referralsService.findMyReferrals(user);
  }

  @Get('me/summary')
  @ApiOperation({
    summary: 'Rota para recuperar as estatísticas de indicação do influencer autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseMyReferralsSummaryDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMySummary(@CurrentUser() user: User): Promise<ResponseMyReferralsSummaryDto> {
    return this.referralsService.findMySummary(user);
  }
}
