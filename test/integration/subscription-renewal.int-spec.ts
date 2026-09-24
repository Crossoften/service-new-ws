import { PrismaService } from '@database/PrismaService';

import { MercadoPagoService } from '../../src/modules/mercado-pago/mercado-pago.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { WebhooksService } from '../../src/modules/webhooks/webhooks.service';
import { criarCategoriaDeServico, criarPlano, criarUsuario, limparBanco, prisma } from './db';

/**
 * A renovação emendando no período vigente, provada com o webhook de verdade.
 *
 * É a parte do P2 que mais erra em silêncio: a conta está num lugar, o
 * pagamento chega por outro, e o resultado só aparece semanas depois como
 * "perdi dias que paguei" ou "ganhei um mês de graça". Nenhum teste de unidade
 * cobre a travessia inteira.
 */
describe('renovação de assinatura pelo webhook', () => {
  const REFERENCIA = 'ext-renovacao-1';

  function build() {
    const mercadoPago = {
      verifySignature: () => true,
      getPayment: jest
        .fn()
        .mockResolvedValue({ id: 'MP-REN-1', status: 'approved', external_reference: REFERENCIA }),
      mapPaymentMethod: () => 'Pix',
    } as unknown as MercadoPagoService;

    const notificacoes = { notifyUser: jest.fn() } as unknown as NotificationsService;

    return new WebhooksService(prisma as unknown as PrismaService, mercadoPago, notificacoes);
  }

  async function cenario(opcoes: { terminaEm: Date | null; comecouEm?: Date }) {
    const assinante = await criarUsuario('Assinante');
    const admin = await criarUsuario('Recebedor');
    const categoria = await criarCategoriaDeServico('Pintor');
    const plano = await criarPlano('Plano mensal', '19.90', 1);

    const assinatura = await prisma.subscription.create({
      data: {
        userId: assinante.id,
        planId: plano.id,
        categoryId: categoria.id,
        status: opcoes.terminaEm ? 'Active' : 'Pending',
        amount: '19.90',
        planName: 'Plano mensal',
        planInterval: 'Month',
        intervalCount: 1,
        startedAt: opcoes.comecouEm ?? null,
        currentPeriodEnd: opcoes.terminaEm,
      },
      select: { id: true },
    });

    await prisma.payment.create({
      data: {
        status: 'Pending',
        referenceType: 'Subscription',
        referenceId: assinatura.id,
        amount: '19.90',
        payerId: assinante.id,
        receiverId: admin.id,
        externalReference: REFERENCIA,
      },
    });

    return { assinatura };
  }

  const notificar = (service: WebhooksService) =>
    service.handleMercadoPagoNotification(
      { type: 'payment', data: { id: 'MP-REN-1' } },
      {},
      'assinatura',
    );

  beforeEach(limparBanco);
  afterAll(() => prisma.$disconnect());

  it('emenda no fim do período vigente, sem perder os dias pagos', async () => {
    const fimAtual = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const { assinatura } = await cenario({ terminaEm: fimAtual });

    await notificar(build());

    const depois = await prisma.subscription.findUniqueOrThrow({ where: { id: assinatura.id } });

    // Um mês contado a partir do vencimento, não do pagamento: os cinco dias
    // que faltavam continuam sendo do assinante.
    const esperado = new Date(fimAtual);
    esperado.setMonth(esperado.getMonth() + 1);

    expect(depois.currentPeriodStart!.getTime()).toBe(fimAtual.getTime());
    expect(depois.currentPeriodEnd!.toDateString()).toBe(esperado.toDateString());
  });

  it('renovada depois de vencer, conta a partir do pagamento', async () => {
    const venceuOntem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { assinatura } = await cenario({ terminaEm: venceuOntem });

    await notificar(build());

    const depois = await prisma.subscription.findUniqueOrThrow({ where: { id: assinatura.id } });

    // Emendar num vencimento passado entregaria menos de um ciclo inteiro pelo
    // preço de um ciclo inteiro.
    expect(depois.currentPeriodStart!.getTime()).toBeGreaterThan(venceuOntem.getTime());
    expect(depois.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now());
  });

  it('preserva a data de adesão ao renovar', async () => {
    const aderiuEm = new Date(2026, 0, 15);
    const { assinatura } = await cenario({
      terminaEm: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      comecouEm: aderiuEm,
    });

    await notificar(build());

    const depois = await prisma.subscription.findUniqueOrThrow({ where: { id: assinatura.id } });

    // `startedAt` marca há quanto tempo a pessoa é assinante. Reescrever a cada
    // renovação apagaria essa informação para sempre.
    expect(depois.startedAt!.toDateString()).toBe(aderiuEm.toDateString());
  });

  it('a primeira ativação conta do pagamento e grava a adesão', async () => {
    const { assinatura } = await cenario({ terminaEm: null });

    await notificar(build());

    const depois = await prisma.subscription.findUniqueOrThrow({ where: { id: assinatura.id } });

    expect(depois.status).toBe('Active');
    expect(depois.startedAt).not.toBeNull();
    expect(depois.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now());
  });

  it('um pagamento confirmado desfaz o cancelamento agendado', async () => {
    const { assinatura } = await cenario({
      terminaEm: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });
    await prisma.subscription.update({
      where: { id: assinatura.id },
      data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });

    await notificar(build());

    const depois = await prisma.subscription.findUniqueOrThrow({ where: { id: assinatura.id } });

    expect(depois.cancelAtPeriodEnd).toBe(false);
    expect(depois.cancelledAt).toBeNull();
  });

  it('notificação duplicada não estica o período duas vezes', async () => {
    const { assinatura } = await cenario({
      terminaEm: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    const service = build();
    await notificar(service);
    const primeiraVez = await prisma.subscription.findUniqueOrThrow({
      where: { id: assinatura.id },
    });

    await notificar(service);
    const segundaVez = await prisma.subscription.findUniqueOrThrow({
      where: { id: assinatura.id },
    });

    // O Mercado Pago reenvia notificação por padrão. Sem a trava do
    // `claimPayment`, cada reenvio daria um mês de graça ao assinante.
    expect(segundaVez.currentPeriodEnd!.getTime()).toBe(primeiraVez.currentPeriodEnd!.getTime());
  });
});
