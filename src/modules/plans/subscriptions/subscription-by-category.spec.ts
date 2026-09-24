import { assinaturaVigenteWhere } from '../../subscription-guard/active-subscription.filter';
import { SubscriptionStatusEnum } from '../enums/subscription-status.enum';
import { inicioDaCarencia } from './subscription-period';
import { SubscriptionAlreadyActiveException } from './exceptions/subscription-already-active.exception';

/**
 * A regra que este arquivo protege: a cobrança é por categoria de atuação.
 *
 * O predicado é testado direto, sem Prisma, porque ele é a regra. Duas decisões
 * dependem dele — o portão que libera a operação e a criação que recusa cobrar
 * de novo — e é a igualdade entre as duas que impede o fornecedor de pagar por
 * algo que já tem, ou de pagar e continuar barrado.
 */
function periodoEmAberto(agora: Date) {
  return [
    { currentPeriodEnd: null },
    { currentPeriodEnd: { gte: agora } },
    {
      AND: [{ cancelAtPeriodEnd: false }, { currentPeriodEnd: { gte: inicioDaCarencia(agora) } }],
    },
  ];
}

describe('assinaturaVigenteWhere', () => {
  const AGORA = new Date('2026-09-24T12:00:00.000Z');

  it('sem categoria, pergunta apenas por assinatura vigente', () => {
    const where = assinaturaVigenteWhere(10, undefined, AGORA);

    expect(where.userId).toBe(10);
    expect(where.status).toBe(SubscriptionStatusEnum.Active);
    expect(where.AND).toEqual([{ OR: periodoEmAberto(AGORA) }]);
  });

  it('com categoria, soma a condição sem perder a do período', () => {
    const where = assinaturaVigenteWhere(10, 3, AGORA);

    // Esta é a asserção que importa. A primeira versão deste código punha as
    // duas condições na mesma chave `OR` do mesmo objeto: a segunda apagava a
    // primeira, e o portão passava a liberar assinatura vencida da categoria
    // certa. O build não acusa — não é chave literal duplicada, é spread.
    expect(where.AND).toEqual([
      { OR: periodoEmAberto(AGORA) },
      { OR: [{ categoryId: 3 }, { categoryId: null }] },
    ]);
  });

  it('aceita cobertura ampla: a concessão administrativa não fica presa a uma categoria', () => {
    const where = assinaturaVigenteWhere(10, 3, AGORA);
    const condicaoDeCategoria = (where.AND as Array<{ OR: unknown }>)[1];

    expect(condicaoDeCategoria.OR).toContainEqual({ categoryId: null });
  });

  it('usa o agora recebido, e não o relógio, para o teste ser determinístico', () => {
    const outraHora = new Date('2027-01-01T00:00:00.000Z');
    const where = assinaturaVigenteWhere(10, undefined, outraHora);

    expect(where.AND).toEqual([{ OR: periodoEmAberto(outraHora) }]);
  });
});

describe('SubscriptionAlreadyActiveException', () => {
  it('nomeia a categoria já paga', () => {
    // Quem assina três categorias precisa saber qual delas recusou a cobrança.
    expect(new SubscriptionAlreadyActiveException('Pintor').message).toContain('Pintor');
  });

  it('mantém a mensagem antiga quando não há categoria', () => {
    expect(new SubscriptionAlreadyActiveException().message).toBe(
      'O usuário já possui uma assinatura ativa.',
    );
  });
});
