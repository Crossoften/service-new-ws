import { PaymentMethodEnum } from '@prisma/client';

/**
 * Maquininha própria do estabelecimento, isolado para ser testado sem banco.
 *
 * A decisão que importa é uma só: **este pedido passa pela plataforma?** Dela
 * dependem três coisas que, se divergirem, custam dinheiro — se há checkout
 * com split, se a confirmação de pagamento é manual, e se o entregador é
 * creditado pelo frete.
 */

/**
 * Versão do termo de responsabilidade aceito ao ligar a modalidade.
 *
 * Guardar a versão, e não só a data, é o que torna o aceite verificável depois:
 * sem ela não dá para dizer sobre qual texto o estabelecimento concordou.
 * Mudou o texto do termo, sobe a versão — e quem aceitou a anterior continua
 * com o registro correto do que assinou.
 */
export const CARD_MACHINE_TERMS_VERSION = '2026-09-21';

/**
 * O dinheiro deste pedido não passa pela plataforma.
 *
 * Dinheiro é sempre em mãos. Cartão só sai do gateway quando o estabelecimento
 * cobra na maquininha dele — **a maquininha é de cartão**, então Pix e boleto
 * seguem pelo Mercado Pago mesmo com a modalidade ligada.
 */
export function isSettledOffPlatform(
  paymentMethod: PaymentMethodEnum,
  usesOwnCardMachine: boolean,
): boolean {
  if (paymentMethod === PaymentMethodEnum.Cash) return true;

  const noCartao =
    paymentMethod === PaymentMethodEnum.CreditCard || paymentMethod === PaymentMethodEnum.DebitCard;

  return usesOwnCardMachine && noCartao;
}
