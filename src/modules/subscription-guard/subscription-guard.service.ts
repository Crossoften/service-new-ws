import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { assinaturaVigenteWhere } from './active-subscription.filter';
import { ProviderNotSellingException } from './exceptions/provider-not-selling.exception';
import { SupplierSubscriptionRequiredException } from './exceptions/supplier-subscription-required.exception';

@Injectable()
export class SubscriptionGuardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * BE-15/BE-16: assinatura é pré-condição para o fornecedor operar em todas as
   * verticais — **inclusive no delivery**.
   *
   * Até esta mudança o delivery era híbrido: quem tinha `billingType`
   * `Commission` passava pelo portão sem assinatura nenhuma, e quem tinha
   * `Subscription` pagava a assinatura e não pagava percentual. Era um ou o
   * outro, nunca os dois. A regra do produto passou a ser a soma: quem opera
   * delivery paga a assinatura **e** o percentual, então não há mais isenção a
   * conceder e o parâmetro que a concedia deixou de existir — em vez de ficar
   * disponível como um desvio adormecido dentro de um portão de cobrança.
   *
   * `categoryId` restringe a pergunta a uma categoria de atuação. Sem ele, a
   * pergunta continua sendo a antiga — qualquer assinatura vigente serve —, que
   * é o que as verticais sem cobrança por categoria ainda precisam.
   */
  async assertActiveSubscription(user: User, options?: { categoryId?: number }): Promise<void> {
    if (!(await this.hasActiveSubscription(user.id, options?.categoryId))) {
      throw new SupplierSubscriptionRequiredException(options?.categoryId);
    }
  }

  /**
   * Confirma que o fornecedor do outro lado ainda pode vender.
   *
   * Chamado pelo lado do consumidor, na porta de entrada de cada negócio. Sem
   * isso a assinatura só valia no dia do cadastro: o `assertActiveSubscription`
   * era chamado exclusivamente no `create` de cada vertical, então tudo que o
   * fornecedor publicou enquanto estava em dia seguia à venda para sempre,
   * pagando ou não.
   *
   * Só barra negócio NOVO. O que já estava em andamento quando a assinatura
   * venceu segue até o fim — quem está no meio de um pedido é o cliente, que
   * não tem pendência nenhuma.
   */
  async assertProviderCanSell(
    providerId: number,
    options?: { categoryId?: number },
  ): Promise<void> {
    if (!(await this.hasActiveSubscription(providerId, options?.categoryId))) {
      throw new ProviderNotSellingException();
    }
  }

  /**
   * Assinatura vigente é status ativo E período em aberto.
   *
   * A data é conferida aqui, na leitura, em vez de depender de alguém marcar
   * `Expired` no banco — valor que, aliás, existe no enum e nunca foi gravado
   * por nenhuma rotina. Conferir na leitura não tem job para falhar nem estado
   * para divergir: no segundo seguinte ao vencimento, o portão já fecha.
   *
   * O predicado mora em `assinaturaVigenteWhere` porque a criação de
   * assinatura precisa fazer exatamente a mesma pergunta.
   */
  private async hasActiveSubscription(userId: number, categoryId?: number): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: assinaturaVigenteWhere(userId, categoryId),
      select: { id: true },
    });

    return Boolean(subscription);
  }
}
