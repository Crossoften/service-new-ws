import { Body, Controller, Delete, Get, Headers, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import {
  RemovePushSubscriptionDto,
  ResponsePushPublicKeyDto,
  SavePushSubscriptionDto,
} from './dto/save-push-subscription.dto';
import { PushService } from './push.service';

@ApiTags('Notificações push')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('public-key')
  @IsPublic()
  @ApiOperation({
    summary: 'Chave pública VAPID, para o navegador se inscrever.',
    description:
      'Pública por natureza: é ela que vai no `applicationServerKey` do ' +
      '`pushManager.subscribe`. A chave privada nunca sai do servidor.\n\n' +
      'Devolve `null` quando o Web Push não está configurado no ambiente — nesse caso a ' +
      'tela deve omitir a oferta de notificações, não tratar como erro.',
  })
  @ApiOkResponse({ type: ResponsePushPublicKeyDto })
  getPublicKey(): ResponsePushPublicKeyDto {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscriptions')
  @ApiOperation({
    summary: 'Registra a inscrição de push deste navegador.',
    description:
      'Idempotente por `endpoint`: reinscrever o mesmo navegador atualiza as chaves em vez ' +
      'de criar uma segunda inscrição. Um usuário pode ter várias — celular e desktop são ' +
      'inscrições distintas.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ description: 'Inscrição registrada.' })
  @ApiBadRequestResponse({ description: 'Endpoint ou chaves ausentes.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  async subscribe(
    @CurrentUser() user: User,
    @Body() payload: SavePushSubscriptionDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<{ message: string }> {
    return this.pushService.saveSubscription(user.id, payload, userAgent);
  }

  @Delete('subscriptions')
  @ApiOperation({
    summary: 'Remove a inscrição deste navegador.',
    description:
      'Idempotente: remover uma inscrição que já não existe não é erro. O navegador pode ' +
      'tê-la perdido antes de avisar o servidor.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ description: 'Inscrição removida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  async unsubscribe(
    @CurrentUser() user: User,
    @Body() payload: RemovePushSubscriptionDto,
  ): Promise<{ message: string }> {
    return this.pushService.removeSubscription(user.id, payload.endpoint);
  }
}
