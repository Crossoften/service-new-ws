import { SubscriptionIntervalEnum } from '../enums/subscription-interval.enum';

/**
 * Quantos dias antes do vencimento o botão de renovar aparece.
 *
 * Sete, e não trinta: o plano mensal dura trinta dias, então avisar com um mês
 * de antecedência seria avisar o tempo inteiro, e o aviso deixaria de significar
 * qualquer coisa.
 */
export const JANELA_DE_RENOVACAO_DIAS = 7;

/**
 * Tolerância depois do vencimento, em dias.
 *
 * Sem ela o corte é seco: vence às 23h59 e às 00h00 o fornecedor some da
 * plataforma, mesmo tendo pago onze meses seguidos. Três dias cobrem o fim de
 * semana e o boleto que compensou tarde.
 */
export const DIAS_DE_CARENCIA = 3;

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

/** Último dia do mês de uma data, em número (28, 29, 30 ou 31). */
function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/**
 * Soma meses preservando o dia, sem transbordar para o mês seguinte.
 *
 * `setMonth` do JavaScript transborda: 31 de janeiro mais um mês vira 3 de
 * março, porque fevereiro não tem dia 31. Numa assinatura que renova, o erro
 * COMPÕE — cada ciclo empurra a data mais para a frente, e em um ano o
 * fornecedor ganha dias que não pagou. Aqui o dia é preso ao último do mês de
 * destino: 31 de janeiro mais um mês é 28 (ou 29) de fevereiro.
 */
function somarMeses(base: Date, meses: number): Date {
  const resultado = new Date(base.getTime());
  const diaDesejado = resultado.getDate();

  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + meses);
  resultado.setDate(
    Math.min(diaDesejado, ultimoDiaDoMes(resultado.getFullYear(), resultado.getMonth())),
  );

  return resultado;
}

/** Fim do período, a partir da base e do ciclo contratado. */
export function calcularFimDoPeriodo(
  base: Date,
  interval: SubscriptionIntervalEnum | string,
  intervalCount: number,
  bonusMonths = 0,
): Date {
  const mesesDoCiclo =
    interval === SubscriptionIntervalEnum.Year ? intervalCount * 12 : intervalCount;

  return somarMeses(base, mesesDoCiclo + bonusMonths);
}

/**
 * De onde o novo período começa a contar.
 *
 * Emenda no fim do período vigente, e não na data do pagamento: quem renova no
 * dia 25 de um ciclo de 30 não pode perder os cinco dias que já pagou.
 *
 * Quando o período já venceu — renovação dentro da carência, por exemplo —, a
 * base passa a ser o pagamento. Emendar num vencimento passado entregaria menos
 * de um ciclo inteiro por um ciclo inteiro cobrado.
 */
export function baseDoNovoPeriodo(fimAtual: Date | null, pagoEm: Date): Date {
  return fimAtual && fimAtual.getTime() > pagoEm.getTime() ? fimAtual : pagoEm;
}

/** Instante a partir do qual uma assinatura vencida ainda é tolerada. */
export function inicioDaCarencia(agora: Date): Date {
  return new Date(agora.getTime() - DIAS_DE_CARENCIA * UM_DIA_EM_MS);
}

export interface EstadoDoCiclo {
  /** Dias inteiros até o vencimento. Negativo depois de vencido. */
  daysUntilExpiration: number | null;
  /** O botão de renovar deve aparecer. */
  needsRenewal: boolean;
  /** Vencida, porém ainda dentro dos dias de tolerância. */
  inGracePeriod: boolean;
  /** Vencida e fora da tolerância. */
  expired: boolean;
}

/**
 * O que a tela precisa saber sobre o ciclo, derivado só da data.
 *
 * Nada disso é guardado no banco de propósito. Campo gravado exige rotina que o
 * atualize, e a rotina é mais uma coisa que pode falhar em silêncio — foi a
 * mesma razão de `Expired` existir no enum e nunca ter sido escrito.
 *
 * Quem cancelou não precisa renovar: `needsRenewal` fica falso, senão a tela
 * ofereceria pagamento a quem acabou de pedir para sair.
 */
export function estadoDoCiclo(
  fimDoPeriodo: Date | null,
  cancelAtPeriodEnd: boolean,
  agora: Date = new Date(),
): EstadoDoCiclo {
  if (!fimDoPeriodo) {
    return {
      daysUntilExpiration: null,
      needsRenewal: false,
      inGracePeriod: false,
      expired: false,
    };
  }

  const restanteEmMs = fimDoPeriodo.getTime() - agora.getTime();
  const daysUntilExpiration = Math.ceil(restanteEmMs / UM_DIA_EM_MS);
  const vencida = restanteEmMs <= 0;
  const dentroDaCarencia = vencida && fimDoPeriodo.getTime() >= inicioDaCarencia(agora).getTime();

  return {
    daysUntilExpiration,
    needsRenewal: !cancelAtPeriodEnd && daysUntilExpiration <= JANELA_DE_RENOVACAO_DIAS,
    inGracePeriod: !cancelAtPeriodEnd && dentroDaCarencia,
    expired: vencida && !(!cancelAtPeriodEnd && dentroDaCarencia),
  };
}
