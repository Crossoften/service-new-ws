import { PrismaService } from '@database/PrismaService';

import { SubscriptionGuardService } from '../../src/modules/subscription-guard/subscription-guard.service';
import { ProviderNotSellingException } from '../../src/modules/subscription-guard/exceptions/provider-not-selling.exception';
import { SubscriptionsService } from '../../src/modules/plans/subscriptions/subscriptions.service';
import { PlansService } from '../../src/modules/plans/plans/plans.service';
import { SubscriptionNotCancelledException } from '../../src/modules/plans/subscriptions/exceptions/subscription-not-cancelled.exception';
import { SubscriptionRenewalNotDueException } from '../../src/modules/plans/subscriptions/exceptions/subscription-renewal-not-due.exception';
import { SubscriptionCancelledCannotRenewException } from '../../src/modules/plans/subscriptions/exceptions/subscription-cancelled-cannot-renew.exception';
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
 * O ciclo de vida da assinatura, contra o banco de verdade.
 *
 * O que está sendo protegido aqui é a promessa da peça de venda: "sem
 * fidelidade, cancele quando quiser". Ela só se cumpre se cancelar preservar o
 * que já foi pago — e isso depende do portão e do cancelamento concordarem
 * sobre o que significa "ativa", que é justamente o tipo de acordo que um
 * teste sem banco não consegue verificar.
 */
describe('ciclo de vida da assinatura', () => {
  const guard = new SubscriptionGuardService(prisma as unknown as PrismaService);

  const mercadoPagoFake = {
    createPreference: jest
      .fn()
      .mockResolvedValue({ preferenceId: 'pref-teste', checkoutUrl: 'https://checkout/teste' }),
  };
  const notificacoesFake = { notifyUser: jest.fn().mockResolvedValue(undefined) };

  const service = new SubscriptionsService(
    prisma as unknown as PrismaService,
    mercadoPagoFake as never,
    notificacoesFake as never,
    new PlansService(prisma as unknown as PrismaService),
  );

  const emDias = (dias: number) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

  async function cenario(opcoes?: { terminaEm?: Date; cancelAtPeriodEnd?: boolean }) {
    const fornecedor = await criarUsuario('Fornecedor');
    const categoria = await criarCategoriaDeServico('Pintor');
    const plano = await criarPlano('Plano mensal', '19.90', 1);
    const assinatura = await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: plano.id,
      categoryId: categoria.id,
      terminaEm: opcoes?.terminaEm ?? emDias(20),
      cancelAtPeriodEnd: opcoes?.cancelAtPeriodEnd,
    });

    const usuario = await prisma.user.findUniqueOrThrow({ where: { id: fornecedor.id } });

    return { usuario, categoria, plano, assinatura };
  }

  beforeEach(async () => {
    await limparBanco();
    mercadoPagoFake.createPreference.mockClear();
  });
  afterAll(() => prisma.$disconnect());

  describe('cancelamento', () => {
    it('mantém o acesso até o fim do período pago', async () => {
      const { usuario, categoria, assinatura } = await cenario({ terminaEm: emDias(300) });

      await service.cancel(usuario, assinatura.id);

      const depois = await prisma.subscription.findUniqueOrThrow({ where: { id: assinatura.id } });

      // Esta é a regra inteira: o status NÃO vira Cancelled, senão quem pagou o
      // ano e desiste no segundo mês perderia dez meses pagos.
      expect(depois.status).toBe('Active');
      expect(depois.cancelAtPeriodEnd).toBe(true);
      expect(depois.cancelledAt).not.toBeNull();

      await expect(
        guard.assertProviderCanSell(usuario.id, { categoryId: categoria.id }),
      ).resolves.toBeUndefined();
    });

    it('encerra na hora quando não há período a agendar', async () => {
      const fornecedor = await criarUsuario('Cortesia');
      const plano = await criarPlano('Plano mensal', '19.90', 1);
      await prisma.subscription.create({
        data: {
          userId: fornecedor.id,
          planId: plano.id,
          status: 'Active',
          amount: '0',
          planName: 'Concessão',
          planInterval: 'Month',
          intervalCount: 1,
          currentPeriodEnd: null,
        },
      });
      const assinatura = await prisma.subscription.findFirstOrThrow({
        where: { userId: fornecedor.id },
      });
      const usuario = await prisma.user.findUniqueOrThrow({ where: { id: fornecedor.id } });

      await service.cancel(usuario, assinatura.id);

      // Agendar numa assinatura sem prazo deixaria o acesso valendo para
      // sempre: não existe data para o portão fechar.
      const depois = await prisma.subscription.findUniqueOrThrow({ where: { id: assinatura.id } });
      expect(depois.status).toBe('Cancelled');
      await expect(guard.assertProviderCanSell(usuario.id)).rejects.toBeInstanceOf(
        ProviderNotSellingException,
      );
    });

    it('terminado o período, o portão fecha sem nada rodar', async () => {
      const { usuario, categoria } = await cenario({
        terminaEm: emDias(-1),
        cancelAtPeriodEnd: true,
      });

      // Cancelada e vencida ontem: a carência não vale para quem cancelou.
      await expect(
        guard.assertProviderCanSell(usuario.id, { categoryId: categoria.id }),
      ).rejects.toBeInstanceOf(ProviderNotSellingException);
    });
  });

  describe('carência', () => {
    it(`vencida há menos de ${DIAS_DE_CARENCIA} dias continua operando`, async () => {
      const { usuario, categoria } = await cenario({ terminaEm: emDias(-2) });

      await expect(
        guard.assertProviderCanSell(usuario.id, { categoryId: categoria.id }),
      ).resolves.toBeUndefined();
    });

    it(`vencida há mais de ${DIAS_DE_CARENCIA} dias não opera`, async () => {
      const { usuario, categoria } = await cenario({ terminaEm: emDias(-DIAS_DE_CARENCIA - 1) });

      await expect(
        guard.assertProviderCanSell(usuario.id, { categoryId: categoria.id }),
      ).rejects.toBeInstanceOf(ProviderNotSellingException);
    });
  });

  describe('reativação', () => {
    it('desfaz o cancelamento sem cobrar', async () => {
      const { usuario, assinatura } = await cenario({ cancelAtPeriodEnd: true });

      await service.reactivate(usuario, assinatura.id);

      const depois = await prisma.subscription.findUniqueOrThrow({ where: { id: assinatura.id } });
      expect(depois.cancelAtPeriodEnd).toBe(false);
      expect(depois.cancelledAt).toBeNull();
      expect(mercadoPagoFake.createPreference).not.toHaveBeenCalled();
    });

    it('recusa quem não tem cancelamento agendado', async () => {
      const { usuario, assinatura } = await cenario();

      await expect(service.reactivate(usuario, assinatura.id)).rejects.toBeInstanceOf(
        SubscriptionNotCancelledException,
      );
    });
  });

  describe('renovação', () => {
    it('recusa fora da janela de sete dias', async () => {
      const { usuario, assinatura } = await cenario({ terminaEm: emDias(20) });

      await expect(service.renew(usuario, assinatura.id)).rejects.toBeInstanceOf(
        SubscriptionRenewalNotDueException,
      );
    });

    it('gera checkout dentro da janela', async () => {
      const { usuario, assinatura } = await cenario({ terminaEm: emDias(3) });
      await criarUsuario('Admin');
      await prisma.user.updateMany({ where: { name: 'Admin' }, data: { role: 'Admin' } });

      const resultado = await service.renew(usuario, assinatura.id);

      expect(resultado.checkoutUrl).toBe('https://checkout/teste');

      const cobranca = await prisma.payment.findFirstOrThrow({
        where: { referenceType: 'Subscription', referenceId: assinatura.id },
      });
      expect(cobranca.status).toBe('Pending');
      expect(cobranca.amount.toFixed(2)).toBe('19.90');
    });

    it('recusa renovar assinatura com cancelamento agendado', async () => {
      const { usuario, assinatura } = await cenario({
        terminaEm: emDias(3),
        cancelAtPeriodEnd: true,
      });

      // Deixar o pagamento reativar em silêncio cobraria de quem só queria
      // desfazer o cancelamento. Reativar é de graça e vem antes.
      await expect(service.renew(usuario, assinatura.id)).rejects.toBeInstanceOf(
        SubscriptionCancelledCannotRenewException,
      );
    });

    it('a renovação fica disponível durante a carência', async () => {
      const { usuario, assinatura } = await cenario({ terminaEm: emDias(-2) });
      await criarUsuario('Admin');
      await prisma.user.updateMany({ where: { name: 'Admin' }, data: { role: 'Admin' } });

      await expect(service.renew(usuario, assinatura.id)).resolves.toMatchObject({
        checkoutUrl: 'https://checkout/teste',
      });
    });
  });

  describe('estado exposto ao front', () => {
    it('traz os campos derivados do ciclo', async () => {
      const { usuario, assinatura } = await cenario({ terminaEm: emDias(3) });

      const resposta = await service.findById(usuario, assinatura.id);

      expect(resposta.needsRenewal).toBe(true);
      expect(resposta.inGracePeriod).toBe(false);
      expect(resposta.expired).toBe(false);
      expect(resposta.cancelAtPeriodEnd).toBe(false);
      expect(resposta.daysUntilExpiration).toBe(3);
    });

    it('não oferece renovação a quem cancelou', async () => {
      const { usuario, assinatura } = await cenario({
        terminaEm: emDias(3),
        cancelAtPeriodEnd: true,
      });

      const resposta = await service.findById(usuario, assinatura.id);

      expect(resposta.cancelAtPeriodEnd).toBe(true);
      expect(resposta.needsRenewal).toBe(false);
    });
  });
});
