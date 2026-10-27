import { Controller, Get, Query } from '@nestjs/common';
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

import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { QueryAdminSubscriptionDto } from './dto/query-admin-subscription.dto';
import { ResponseFindAllAdminSubscriptionDto } from './dto/response-admin-subscription.dto';

@ApiTags('Assinaturas - Portal Gerencial')
@Controller('admin-subscriptions')
export class AdminSubscriptionsController {
  constructor(private readonly _service: AdminSubscriptionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as assinaturas dos fornecedores, concedidas e pagas.',
    description:
      'Visão geral que as rotas por fornecedor não davam: antes era preciso abrir um ' +
      'fornecedor por vez para saber o que havia sido concedido. Filtra por origem ' +
      '(`Granted` é cortesia ou teste, `Paid` passou pelo pagamento), status, ' +
      'fornecedor e busca por nome ou email. `isCurrent` já vem calculado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllAdminSubscriptionDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryAdminSubscriptionDto,
  ): Promise<ResponseFindAllAdminSubscriptionDto> {
    handleAccessControl.verifyAdminRole(user);
    // Mesma permissão da concessão e do bônus: quem pode liberar pode ver.
    handleAccessControl.verifyPermission(user, 'Users');

    return this._service.findAll(query);
  }
}
