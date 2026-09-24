import { PrismaService } from '@database/PrismaService';

import { PlansService } from '../../src/modules/plans/plans/plans.service';
import { SubscriptionsService } from '../../src/modules/plans/subscriptions/subscriptions.service';
import { SubscriptionGuardService } from '../../src/modules/subscription-guard/subscription-guard.service';
import { DIAS_DE_CARENCIA } from '../../src/modules/plans/subscriptions/subscription-period';
import {
  criarAssinaturaAtiva,
  criarCategoriaDeServico,
  criarPlano,
  criarUsuario,
  limparBanco,
  prisma,
} from './db';

/**
 * O catálogo de contratação, contra o banco.
 *
 * O que está em jogo aqui não é o formato da resposta, e sim um acordo: o que
 * a tela chama de "assinado" precisa ser exatamente o que o portão deixa
 * passar. Se as duas leituras divergirem, o fornecedor vê "ativo", clica, e
 * leva um erro que não tem como entender — e o suporte não tem como reproduzir.
 *
 * Por isso quase todo teste aqui confere a resposta do catálogo CONTRA o
 * portão, em vez de contra um valor esperado escrito à mão.
 */
describe('catálogo de assinaturas', () => {
  const guard = new SubscriptionGuardService(prisma as unknown as PrismaService);
  const service = new SubscriptionsService(
    prisma as unknown as PrismaService,
    { createPreference: jest.fn() } as never,
    { notifyUser: jest.fn() } as never,
    new PlansService(prisma as unknown as PrismaService),
  );

  const emDias = (dias: number) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

  /** Confere, categoria a categoria, se o catálogo e o portão concordam. */
  async function catalogoConcordaComOPortao(userId: number) {
    const usuario = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const catalogo = await service.catalog(usuario);

    for (const linha of catalogo.categories) {
      const portaoLiberou = await guard
        .assertProviderCanSell(userId, { categoryId: linha.id })
        .then(() => true)
        .catch(() => false);

      expect({ categoria: linha.name, catalogo: linha.isSubscribed }).toEqual({
        categoria: linha.name,
        catalogo: portaoLiberou,
      });
    }

    return catalogo;
  }

  beforeEach(limparBanco);
  afterAll(() => prisma.$disconnect());

  it('lista todas as categorias ativas com os planos ativos', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    await criarCategoriaDeServico('Pintor');
    await criarCategoriaDeServico('Pedreiro');
    await criarPlano('Plano mensal', '19.90', 1);
    const inativo = await criarPlano('Plano trimestral', '99.90', 3);
    await prisma.plan.update({ where: { id: inativo.id }, data: { isActive: false } });

    const usuario = await prisma.user.findUniqueOrThrow({ where: { id: fornecedor.id } });
    const catalogo = await service.catalog(usuario);

    expect(catalogo.categories).toHaveLength(2);
    expect(catalogo.plans.map((plano) => plano.name)).toEqual(['Plano mensal']);
    expect(catalogo.subscribedCount).toBe(0);
  });

  it('o equivalente mensal vem calculado, para a tela não fazer conta', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    await criarPlano('Plano anual', '118.80', 12);

    const usuario = await prisma.user.findUniqueOrThrow({ where: { id: fornecedor.id } });
    const catalogo = await service.catalog(usuario);

    expect(catalogo.plans[0].monthlyPrice).toBe('9.90');
  });

  it('marca só a categoria assinada, e concorda com o portão', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    await criarCategoriaDeServico('Pedreiro');
    const plano = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: plano.id,
      categoryId: pintor.id,
      terminaEm: emDias(20),
    });

    const catalogo = await catalogoConcordaComOPortao(fornecedor.id);

    expect(catalogo.subscribedCount).toBe(1);
    expect(catalogo.categories.find((linha) => linha.id === pintor.id)?.isSubscribed).toBe(true);
  });

  it('a concessão administrativa marca todas as categorias', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    await criarCategoriaDeServico('Pintor');
    await criarCategoriaDeServico('Pedreiro');
    const plano = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: plano.id,
      categoryId: null,
      terminaEm: emDias(20),
    });

    const catalogo = await catalogoConcordaComOPortao(fornecedor.id);

    expect(catalogo.subscribedCount).toBe(2);
    // A tela não deve oferecer "cancelar a assinatura de Pintor" quando o que
    // cobre a categoria é uma cortesia que vale para todas.
    expect(catalogo.categories.every((linha) => linha.subscription?.coversAllCategories)).toBe(
      true,
    );
  });

  it('a assinatura própria tem preferência sobre a concessão ampla', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const mensal = await criarPlano('Plano mensal', '19.90', 1);
    const anual = await criarPlano('Plano anual', '118.80', 12);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: mensal.id,
      categoryId: null,
      terminaEm: emDias(10),
    });
    const propria = await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: anual.id,
      categoryId: pintor.id,
      terminaEm: emDias(300),
    });

    const catalogo = await catalogoConcordaComOPortao(fornecedor.id);
    const linha = catalogo.categories.find((item) => item.id === pintor.id);

    // Mostrar a cortesia no lugar da assinatura paga esconderia do fornecedor
    // o vencimento que realmente importa para ele.
    expect(linha?.subscription?.id).toBe(propria.id);
    expect(linha?.subscription?.coversAllCategories).toBe(false);
  });

  it(`categoria na carência aparece como assinada, igual ao portão`, async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const plano = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: plano.id,
      categoryId: pintor.id,
      terminaEm: emDias(-2),
    });

    const catalogo = await catalogoConcordaComOPortao(fornecedor.id);
    const linha = catalogo.categories.find((item) => item.id === pintor.id);

    expect(linha?.isSubscribed).toBe(true);
    expect(linha?.subscription?.inGracePeriod).toBe(true);
    expect(linha?.subscription?.needsRenewal).toBe(true);
  });

  it(`categoria vencida além dos ${DIAS_DE_CARENCIA} dias aparece como disponível`, async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const plano = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: plano.id,
      categoryId: pintor.id,
      terminaEm: emDias(-DIAS_DE_CARENCIA - 1),
    });

    const catalogo = await catalogoConcordaComOPortao(fornecedor.id);

    expect(catalogo.categories.find((item) => item.id === pintor.id)?.isSubscribed).toBe(false);
    expect(catalogo.subscribedCount).toBe(0);
  });

  it('categoria cancelada e vencida aparece como disponível', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const plano = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: plano.id,
      categoryId: pintor.id,
      terminaEm: emDias(-1),
      cancelAtPeriodEnd: true,
    });

    // Quem cancelou não recebe a tolerância — e o catálogo tem que dizer o
    // mesmo, senão a tela mostra "ativo" um dia depois de o acesso acabar.
    const catalogo = await catalogoConcordaComOPortao(fornecedor.id);

    expect(catalogo.categories.find((item) => item.id === pintor.id)?.isSubscribed).toBe(false);
  });

  it('categoria cancelada dentro do período segue assinada, sem convite a renovar', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const plano = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: plano.id,
      categoryId: pintor.id,
      terminaEm: emDias(3),
      cancelAtPeriodEnd: true,
    });

    const catalogo = await catalogoConcordaComOPortao(fornecedor.id);
    const linha = catalogo.categories.find((item) => item.id === pintor.id);

    expect(linha?.isSubscribed).toBe(true);
    expect(linha?.subscription?.cancelAtPeriodEnd).toBe(true);
    expect(linha?.subscription?.needsRenewal).toBe(false);
  });

  it('categoria inativa não aparece no catálogo', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    await prisma.serviceCategory.update({ where: { id: pintor.id }, data: { isActive: false } });

    const usuario = await prisma.user.findUniqueOrThrow({ where: { id: fornecedor.id } });
    const catalogo = await service.catalog(usuario);

    expect(catalogo.categories).toHaveLength(0);
  });
});
