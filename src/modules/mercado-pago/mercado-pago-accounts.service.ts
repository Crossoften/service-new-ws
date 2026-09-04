import { PrismaService } from '@database/PrismaService';
import { Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import {
  ResponseMercadoPagoStatusDto,
  ResponseOAuthCallbackDto,
} from './dto/response-mercado-pago-account.dto';
import { MercadoPagoService, SellerLink } from './mercado-pago.service';

/**
 * Guarda e recupera o vínculo do vendedor com o Mercado Pago.
 *
 * Separado do `MercadoPagoService` porque aquele não conhece banco — fala só com
 * a API do provedor. Aqui fica tudo que toca em `User`, o que mantém a fronteira
 * clara e deixa o serviço de integração testável sem Prisma.
 */
@Injectable()
export class MercadoPagoAccountsService {
  private readonly logger = new Logger(MercadoPagoAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  async status(user: User): Promise<ResponseMercadoPagoStatusDto> {
    const conta = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { mpUserId: true, mpAccessToken: true, mpLinkedAt: true },
    });

    const isLinked = !!conta?.mpUserId && !!conta?.mpAccessToken;

    return {
      isLinked,
      mpUserId: isLinked ? conta.mpUserId : undefined,
      linkedAt: conta?.mpLinkedAt ?? undefined,
    };
  }

  async link(user: User, payload: OAuthCallbackDto): Promise<ResponseOAuthCallbackDto> {
    const vinculo = await this.mercadoPagoService.exchangeCodeForSellerLink(
      payload.code,
      payload.redirectUri,
    );

    await this.persistir(user.id, vinculo);

    return {
      message: 'Conta do Mercado Pago vinculada com sucesso.',
      mpUserId: vinculo.mpUserId,
    };
  }

  /**
   * Devolve o token do vendedor pronto para uso, renovando quando o atual já
   * não é aceito.
   *
   * A renovação acontece aqui, no ponto de uso, e não numa rotina agendada: é
   * onde se descobre que o token venceu, e é onde o vendedor perderia a venda
   * se nada fosse feito.
   */
  async accessTokenFor(userId: number): Promise<string | null> {
    const conta = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mpUserId: true, mpAccessToken: true, mpRefreshToken: true },
    });

    if (!conta?.mpAccessToken) return null;

    try {
      return this.mercadoPagoService.decryptToken(conta.mpAccessToken);
    } catch (error) {
      this.logger.error(
        `Não foi possível decifrar o token do vendedor ${userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );

      return null;
    }
  }

  /**
   * Renova o vínculo do vendedor. Chamado quando o Mercado Pago recusa o token
   * por expiração.
   */
  async refresh(userId: number): Promise<string | null> {
    const conta = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mpRefreshToken: true },
    });

    if (!conta?.mpRefreshToken) return null;

    try {
      const vinculo = await this.mercadoPagoService.refreshSellerLink(conta.mpRefreshToken);
      await this.persistir(userId, vinculo);

      return this.mercadoPagoService.decryptToken(vinculo.mpAccessToken);
    } catch (error) {
      this.logger.error(
        `Falha ao renovar o vínculo do vendedor ${userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );

      return null;
    }
  }

  private async persistir(userId: number, vinculo: SellerLink): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mpUserId: vinculo.mpUserId,
        // Os tokens chegam já cifrados do MercadoPagoService. Nenhum caminho
        // deste arquivo grava texto em claro.
        mpAccessToken: vinculo.mpAccessToken,
        mpRefreshToken: vinculo.mpRefreshToken,
        mpPublicKey: vinculo.mpPublicKey,
        mpLinkedAt: new Date(),
      },
    });
  }
}
