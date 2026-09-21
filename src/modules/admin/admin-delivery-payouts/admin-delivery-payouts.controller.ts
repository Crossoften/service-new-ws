import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
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

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdminDeliveryPayoutsService } from './admin-delivery-payouts.service';
import { CreateDeliveryPayoutDto } from './dto/create-delivery-payout.dto';
import {
  ResponseDeliveryPayoutDto,
  ResponsePendingPayoutDto,
} from './dto/response-delivery-payout.dto';

@ApiTags('Repasses aos entregadores - Portal Gerencial')
@Controller('admin-delivery-payouts')
export class AdminDeliveryPayoutsController {
  constructor(private readonly service: AdminDeliveryPayoutsService) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Lista quanto a plataforma deve a cada entregador.',
    description:
      'Soma os créditos de frete e gorjeta que ainda não foram repassados, com os ' +
      'dados bancários do entregador para o pagamento. Entregador sem conta ' +
      'cadastrada aparece sem `bankAccount`: não há para onde enviar.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: [ResponsePendingPayoutDto] })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findPending(@CurrentUser() user: User): Promise<ResponsePendingPayoutDto[]> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Financial');

    return this.service.findPending();
  }

  @Post()
  @ApiOperation({
    summary: 'Registra um repasse já pago ao entregador.',
    description:
      'O pagamento acontece fora do sistema — o admin faz o Pix e registra aqui. ' +
      'Liquida TODO o saldo em aberto do entregador e grava a saída no razão. ' +
      'Envie `expectedAmount` com o valor que a tela mostrava: se o saldo tiver ' +
      'mudado nesse intervalo, nada é liquidado e a resposta é 409.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: ResponseDeliveryPayoutDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({
    description: 'Sem saldo em aberto, saldo divergente, ou repasse concorrente.',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateDeliveryPayoutDto,
  ): Promise<ResponseDeliveryPayoutDto> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Financial');

    return this.service.create(user.id, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Histórico de repasses pagos.',
    security: [{ bearerAuth: [] }],
  })
  @ApiQuery({ name: 'courierId', required: false, type: Number })
  @ApiOkResponse({ type: [ResponseDeliveryPayoutDto] })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(
    @CurrentUser() user: User,
    @Query('courierId') courierId?: string,
  ): Promise<ResponseDeliveryPayoutDto[]> {
    handleAccessControl.verifyAdminRole(user);
    handleAccessControl.verifyPermission(user, 'Financial');

    return this.service.findAll(courierId ? Number(courierId) : undefined);
  }
}
