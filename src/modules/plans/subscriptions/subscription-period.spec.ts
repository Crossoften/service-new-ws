import { SubscriptionIntervalEnum } from '../enums/subscription-interval.enum';
import {
  DIAS_DE_CARENCIA,
  JANELA_DE_RENOVACAO_DIAS,
  baseDoNovoPeriodo,
  calcularFimDoPeriodo,
  estadoDoCiclo,
  inicioDaCarencia,
} from './subscription-period';

const MENSAL = SubscriptionIntervalEnum.Month;
const ANUAL = SubscriptionIntervalEnum.Year;

describe('calcularFimDoPeriodo', () => {
  it('mensal soma um mês', () => {
    expect(calcularFimDoPeriodo(new Date(2026, 0, 10), MENSAL, 1)).toEqual(new Date(2026, 1, 10));
  });

  it('semestral soma seis meses', () => {
    expect(calcularFimDoPeriodo(new Date(2026, 0, 10), MENSAL, 6)).toEqual(new Date(2026, 6, 10));
  });

  it('anual soma doze meses', () => {
    expect(calcularFimDoPeriodo(new Date(2026, 0, 10), ANUAL, 1)).toEqual(new Date(2027, 0, 10));
  });

  it('soma os meses de bônus por cima do ciclo', () => {
    expect(calcularFimDoPeriodo(new Date(2026, 0, 10), MENSAL, 1, 2)).toEqual(
      new Date(2026, 3, 10),
    );
  });

  it('31 de janeiro mais um mês é o último dia de fevereiro, não 3 de março', () => {
    // `setMonth` transborda: fevereiro não tem dia 31, e o JavaScript joga a
    // data para março. Numa assinatura que renova, o erro COMPÕE — cada ciclo
    // empurra a data adiante e o fornecedor ganha dias que não pagou.
    expect(calcularFimDoPeriodo(new Date(2026, 0, 31), MENSAL, 1)).toEqual(new Date(2026, 1, 28));
  });

  it('respeita ano bissexto ao prender o dia', () => {
    expect(calcularFimDoPeriodo(new Date(2028, 0, 31), MENSAL, 1)).toEqual(new Date(2028, 1, 29));
  });

  it('não acumula erro ao renovar doze vezes a partir do dia 31', () => {
    let data = new Date(2026, 0, 31);
    for (let i = 0; i < 12; i += 1) {
      data = calcularFimDoPeriodo(data, MENSAL, 1);
    }

    // Um ano depois ainda é janeiro, e não fevereiro ou março.
    expect(data.getFullYear()).toBe(2027);
    expect(data.getMonth()).toBe(0);
  });
});

describe('baseDoNovoPeriodo', () => {
  const PAGAMENTO = new Date(2026, 5, 20);

  it('emenda no fim do período quando ele ainda está correndo', () => {
    const fimAtual = new Date(2026, 5, 25);

    // Quem renova no dia 25 de um ciclo de 30 não pode perder os cinco pagos.
    expect(baseDoNovoPeriodo(fimAtual, PAGAMENTO)).toEqual(fimAtual);
  });

  it('usa o pagamento quando o período já venceu', () => {
    // Emendar num vencimento passado entregaria menos de um ciclo inteiro pelo
    // preço de um ciclo inteiro.
    expect(baseDoNovoPeriodo(new Date(2026, 5, 18), PAGAMENTO)).toEqual(PAGAMENTO);
  });

  it('usa o pagamento na primeira ativação, quando não há período', () => {
    expect(baseDoNovoPeriodo(null, PAGAMENTO)).toEqual(PAGAMENTO);
  });
});

describe('estadoDoCiclo', () => {
  const AGORA = new Date(2026, 5, 20, 12, 0, 0);
  const emDias = (dias: number) => new Date(AGORA.getTime() + dias * 24 * 60 * 60 * 1000);

  it('longe do vencimento, não pede renovação', () => {
    const estado = estadoDoCiclo(emDias(20), false, AGORA);

    expect(estado.daysUntilExpiration).toBe(20);
    expect(estado.needsRenewal).toBe(false);
    expect(estado.inGracePeriod).toBe(false);
    expect(estado.expired).toBe(false);
  });

  it(`pede renovação a partir de ${JANELA_DE_RENOVACAO_DIAS} dias do fim`, () => {
    expect(estadoDoCiclo(emDias(JANELA_DE_RENOVACAO_DIAS), false, AGORA).needsRenewal).toBe(true);
    expect(estadoDoCiclo(emDias(JANELA_DE_RENOVACAO_DIAS + 1), false, AGORA).needsRenewal).toBe(
      false,
    );
  });

  it(`tolera ${DIAS_DE_CARENCIA} dias depois de vencer`, () => {
    const naCarencia = estadoDoCiclo(emDias(-2), false, AGORA);

    expect(naCarencia.inGracePeriod).toBe(true);
    expect(naCarencia.expired).toBe(false);
    expect(naCarencia.needsRenewal).toBe(true);
  });

  it('passada a tolerância, está vencida de vez', () => {
    const vencida = estadoDoCiclo(emDias(-DIAS_DE_CARENCIA - 1), false, AGORA);

    expect(vencida.inGracePeriod).toBe(false);
    expect(vencida.expired).toBe(true);
  });

  it('quem cancelou não recebe tolerância nem convite para renovar', () => {
    // A tolerância existe para o boleto que compensou tarde, não para esticar o
    // acesso de quem pediu para sair.
    const cancelada = estadoDoCiclo(emDias(-2), true, AGORA);

    expect(cancelada.inGracePeriod).toBe(false);
    expect(cancelada.expired).toBe(true);
    expect(cancelada.needsRenewal).toBe(false);
  });

  it('cancelada e ainda dentro do período segue valendo', () => {
    const cancelada = estadoDoCiclo(emDias(5), true, AGORA);

    expect(cancelada.expired).toBe(false);
    expect(cancelada.needsRenewal).toBe(false);
  });

  it('assinatura sem prazo nunca vence nem pede renovação', () => {
    const semPrazo = estadoDoCiclo(null, false, AGORA);

    expect(semPrazo.daysUntilExpiration).toBeNull();
    expect(semPrazo.expired).toBe(false);
    expect(semPrazo.needsRenewal).toBe(false);
  });
});

describe('inicioDaCarencia', () => {
  it(`recua ${DIAS_DE_CARENCIA} dias`, () => {
    const agora = new Date(2026, 5, 20);
    const esperado = new Date(agora.getTime() - DIAS_DE_CARENCIA * 24 * 60 * 60 * 1000);

    expect(inicioDaCarencia(agora)).toEqual(esperado);
  });
});
