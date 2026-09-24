import { Prisma } from '@prisma/client';
import { SubscriptionStatusEnum } from '../plans/enums/subscription-status.enum';
import { inicioDaCarencia } from '../plans/subscriptions/subscription-period';

/**
 * Predicado de "assinatura vigente que cobre esta categoria".
 *
 * Mora fora do guard porque duas decisões diferentes precisam da MESMA
 * pergunta: o portão, que libera ou barra a operação, e a criação de
 * assinatura, que recusa cobrar de novo por uma categoria já coberta. Se cada
 * um escrevesse a sua versão, um dia elas divergiriam e o fornecedor pagaria
 * duas vezes pela mesma coisa — ou pagaria e continuaria barrado.
 *
 * `categoryId` indefinido mantém a pergunta antiga: serve qualquer assinatura
 * vigente. É o que as verticais sem cobrança por categoria (produtos,
 * hospedagem, transporte, vagas e delivery) continuam usando.
 *
 * Quando `categoryId` é informado, vale a assinatura daquela categoria OU uma
 * de cobertura ampla (`categoryId` nulo) — hoje só as concessões
 * administrativas, que são cortesia e não deveriam ficar presas a uma
 * categoria.
 *
 * O período é comparado com `AND` explícito, e não com duas chaves `OR` no
 * mesmo objeto: a segunda sobrescreveria a primeira em silêncio e o portão
 * pararia de conferir a data.
 */
export function assinaturaVigenteWhere(
  userId: number,
  categoryId?: number,
  agora: Date = new Date(),
): Prisma.SubscriptionWhereInput {
  // Três condições, nesta ordem: assinatura sem fim (concessão administrativa),
  // período pago ainda correndo, e período vencido porém dentro da tolerância.
  //
  // A tolerância não vale para quem cancelou. Ela existe para o boleto que
  // compensou tarde, não para esticar o acesso de quem pediu para sair — e
  // quem cancelou continua com `status` Active até o período acabar, então sem
  // este filtro ganharia três dias a mais de graça.
  const periodoEmAberto: Prisma.SubscriptionWhereInput = {
    OR: [
      { currentPeriodEnd: null },
      { currentPeriodEnd: { gte: agora } },
      {
        AND: [{ cancelAtPeriodEnd: false }, { currentPeriodEnd: { gte: inicioDaCarencia(agora) } }],
      },
    ],
  };

  const cobreACategoria: Prisma.SubscriptionWhereInput[] =
    categoryId === undefined ? [] : [{ OR: [{ categoryId }, { categoryId: null }] }];

  return {
    userId,
    status: SubscriptionStatusEnum.Active,
    AND: [periodoEmAberto, ...cobreACategoria],
  };
}
