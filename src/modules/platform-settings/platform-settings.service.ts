import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';

import { DEFAULT_COMMISSION_RATE } from '../food-orders/commission';

/**
 * Leitura das configurações globais da plataforma.
 *
 * Mora em módulo próprio, e não em `admin-settings`, por dois motivos. O
 * primeiro é dependência: quem precisa ler é o domínio — delivery, cupons,
 * restaurantes —, e nenhum deles deve importar um módulo de admin para
 * funcionar. O segundo é ciclo: `FoodOrdersModule` já importa `CouponsModule`,
 * então pôr o leitor em qualquer um dos dois fecharia o grafo.
 *
 * A escrita continua sendo exclusividade do `admin-settings`: aqui só se lê.
 */
@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Percentual do delivery definido pelo admin.
   *
   * A linha de configuração é única (`id = 1`) e a coluna é NOT NULL com
   * default, então o caminho normal sempre devolve o valor do painel. O
   * fallback cobre só o caso de a linha não existir — base recém-criada, ou
   * antes de o admin abrir a tela pela primeira vez. Derrubar o pedido nesse
   * caso seria pior: perder venda por falta de uma linha de configuração.
   */
  async deliveryCommissionRate(): Promise<number> {
    const settings = await this.prisma.platformSettings.findUnique({
      where: { id: 1 },
      select: { deliveryCommissionRate: true },
    });

    return settings ? Number(settings.deliveryCommissionRate) : DEFAULT_COMMISSION_RATE;
  }
}
