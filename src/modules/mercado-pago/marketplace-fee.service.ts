import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';

/**
 * Percentual retido pela plataforma no split.
 *
 * Existe porque a implementação original fixava 10% no código — com o comentário
 * "hardcoded 10% marketplace fee" — enquanto o projeto já tinha
 * `ServiceCategory.platformFeeRate` por categoria, sem ninguém consultar.
 *
 * A ordem é: taxa da categoria, quando definida e maior que zero; senão a taxa
 * global de `PlatformSettings`, ajustável pelo admin sem deploy.
 */
@Injectable()
export class MarketplaceFeeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Taxa global da plataforma, em percentual.
   *
   * Cria a linha de configuração quando ela ainda não existe, com os padrões do
   * schema — o mesmo que o módulo de configurações do admin faz. Devolver zero
   * na ausência da linha seria pior que um erro: o split sairia sem taxa e
   * ninguém perceberia, porque o pagamento continuaria funcionando.
   */
  async globalRate(): Promise<number> {
    const settings = await this.prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
      select: { marketplaceFeeRate: true },
    });

    return Number(settings.marketplaceFeeRate);
  }

  /**
   * Taxa aplicável a um serviço, considerando a categoria dele.
   *
   * `serviceId` nulo devolve a taxa global — é o caso de negociação de produto,
   * que não passa por categoria de serviço.
   */
  async rateForService(serviceId?: number | null): Promise<number> {
    if (!serviceId) return this.globalRate();

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { category: { select: { platformFeeRate: true } } },
    });

    const daCategoria = service?.category ? Number(service.category.platformFeeRate) : 0;

    return daCategoria > 0 ? daCategoria : this.globalRate();
  }
}
