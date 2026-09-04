import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import {
  ResponseConnectUrlDto,
  ResponseMercadoPagoStatusDto,
  ResponseOAuthCallbackDto,
} from './dto/response-mercado-pago-account.dto';
import { MercadoPagoAccountsService } from './mercado-pago-accounts.service';
import { MercadoPagoService } from './mercado-pago.service';

@ApiTags('Mercado Pago')
@Controller('mercado-pago')
export class MercadoPagoController {
  constructor(
    private readonly accountsService: MercadoPagoAccountsService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Informa se o usuário logado já vinculou uma conta do Mercado Pago.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseMercadoPagoStatusDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async status(@CurrentUser() user: User): Promise<ResponseMercadoPagoStatusDto> {
    return this.accountsService.status(user);
  }

  @Get('connect-url')
  @ApiOperation({
    summary: 'Devolve a URL do Mercado Pago para o vendedor autorizar a plataforma.',
    description:
      'O front leva o usuário até essa URL. Ao autorizar, o Mercado Pago redireciona para a ' +
      '`redirectUri` com um `code` na query, que deve ser enviado em POST /mercado-pago/oauth/callback. ' +
      'Se informar `redirectUri` aqui, use exatamente a mesma no callback — o Mercado Pago compara.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseConnectUrlDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  connectUrl(@Query('redirectUri') redirectUri?: string): ResponseConnectUrlDto {
    return { url: this.mercadoPagoService.getConnectUrl(redirectUri) };
  }

  @Post('oauth/callback')
  @ApiOperation({
    summary: 'Troca o código da autorização pelos tokens e vincula a conta.',
    description:
      'Os tokens são gravados cifrados. A resposta devolve apenas o identificador público ' +
      'do vendedor — nenhum token sai da API.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseOAuthCallbackDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async oauthCallback(
    @CurrentUser() user: User,
    @Body() body: OAuthCallbackDto,
  ): Promise<ResponseOAuthCallbackDto> {
    return this.accountsService.link(user, body);
  }
}
