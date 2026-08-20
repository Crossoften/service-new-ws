import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '@database/PrismaService';
import { MercadoPagoService } from './mercado-pago.service';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { ConnectUrlResponseDto } from './dto/connect-url-response.dto';
import { OAuthCallbackResponseDto } from './dto/oauth-callback-response.dto';
import { MercadoPagoStatusResponseDto } from './dto/mercado-pago-status-response.dto';

@ApiTags('Mercado Pago')
@Controller('mercado-pago')
export class MercadoPagoController {
  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('connect-url')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retorna a URL do Mercado Pago OAuth para o usuário conectar sua conta de recebedor.',
  })
  @ApiOkResponse({ type: ConnectUrlResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  getConnectUrl(@Query('redirectUri') redirectUri?: string): ConnectUrlResponseDto {
    const url = this.mercadoPagoService.getConnectUrl(redirectUri);
    return { url };
  }

  @Post('oauth/callback')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Processa o código de autorização OAuth e vincula a conta do Mercado Pago ao usuário logado.',
  })
  @ApiOkResponse({ type: OAuthCallbackResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  async handleOAuthCallback(
    @CurrentUser() user: User,
    @Body() payload: OAuthCallbackDto,
  ): Promise<OAuthCallbackResponseDto> {
    const tokens = await this.mercadoPagoService.exchangeCodeForToken(
      payload.code,
      payload.redirectUri,
    );

    const mpUserId = String(tokens.user_id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mpUserId,
        mpAccessToken: tokens.access_token,
        mpRefreshToken: tokens.refresh_token,
        mpPublicKey: tokens.public_key,
      },
    });

    return {
      message: 'Conta do Mercado Pago conectada com sucesso.',
      mpUserId,
    };
  }

  @Get('status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verifica se o usuário logado possui conta do Mercado Pago vinculada.',
  })
  @ApiOkResponse({ type: MercadoPagoStatusResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  async getStatus(@CurrentUser() user: User): Promise<MercadoPagoStatusResponseDto> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { mpUserId: true, mpAccessToken: true },
    });

    const isLinked = !!(dbUser?.mpUserId || dbUser?.mpAccessToken);

    return {
      isLinked,
      mpUserId: dbUser?.mpUserId || null,
    };
  }
}
