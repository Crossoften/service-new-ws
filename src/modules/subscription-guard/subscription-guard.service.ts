import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { BillingTypeEnum, User } from '@prisma/client';
import { assinaturaVigenteWhere } from './active-subscription.filter';
import { ProviderNotSellingException } from './exceptions/provider-not-selling.exception';
import { SupplierSubscriptionRequiredException } from './exceptions/supplier-subscription-required.exception';

@Injectable()
export class SubscriptionGuardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * BE-15/BE-16: assinatura é pré-condição para o fornecedor operar em todas as
   * verticais. No delivery (híbrido), o fornecedor pode optar por comissão por
   * pedido (billingType Commission) em vez de assinatura — nesse caso o gate é
   * ignorado quando allowCommissionBilling é true.
   *
   * `categoryId` restringe a pergunta a uma categoria de atuação. Sem ele, a
   * pergunta continua sendo a antiga — qualquer assinatura vigente serve —, que
   * é o que as verticais sem cobrança por categoria ainda precisam.
   */
  async assertActiveSubscription(
    user: User,
    options?: { allowCommissionBilling?: boolean; categoryId?: number },
  ): Promise<void> {
    if (options?.allowCommissionBilling && user.billingType === BillingTypeEnum.Commission) {
      return;
    }

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
    options?: { allowCommissionBilling?: boolean; categoryId?: number },
  ): Promise<void> {
    if (options?.allowCommissionBilling) {
      const provider = await this.prisma.user.findUnique({
        where: { id: providerId },
        select: { billingType: true },
      });

      if (provider?.billingType === BillingTypeEnum.Commission) {
        return;
      }
    }

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
