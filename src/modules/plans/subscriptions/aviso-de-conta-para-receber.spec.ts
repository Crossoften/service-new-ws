import { PrismaService } from '@database/PrismaService';
import { Prisma, User } from '@prisma/client';

import { MercadoPagoAccountsService } from '../../mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { PlansService } from '../plans/plans.service';
import { SubscriptionsService } from './subscriptions.service';

const FORNECEDOR = { id: 9, name: 'Fornecedor' } as User;

/**
 * O fornecedor assina, publica e só descobre que não pode **receber** quando o
 * primeiro cliente tenta pagar e leva 400 — o pagamento usa split na origem e
 * precisa da conta do vendedor vinculada. Quem perdia a venda era o cliente,
 * por uma pendência de quem vende.
 *
 * A assinatura é o portão por onde todo fornecedor passa antes de operar em
 * qualquer vertical, então é onde o aviso alcança todos, uma vez cada.
 */
function build(isLinked: boolean) {
  const notifyUser = jest.fn().mockResolvedValue(undefined);
  const status = jest.fn().mockResolvedValue({ isLinked });

  const service = new SubscriptionsService(
    {} as PrismaService,
    {} as MercadoPagoService,
    { notifyUser } as unknown as NotificationsService,
    { status } as unknown as MercadoPagoAccountsService,
    {} as PlansService,
  );

  const avisar = (
    service as unknown as { avisarSeFaltaContaParaReceber: (user: User) => Promise<void> }
  ).avisarSeFaltaContaParaReceber.bind(service);

  return { avisar, notifyUser, status };
}

describe('aviso de conta para receber, na assinatura', () => {
  it('avisa quem assinou sem conta vinculada', async () => {
    const { avisar, notifyUser } = build(false);

    await avisar(FORNECEDOR);

    expect(notifyUser).toHaveBeenCalledTimes(1);
    expect(notifyUser.mock.calls[0][0]).toBe(FORNECEDOR.id);
  });

  it('diz o que acontece se não vincular, não só que falta vincular', async () => {
    // "Falta vincular" sozinho não move ninguém; o que move é saber que o
    // cliente não consegue pagar.
    const { avisar, notifyUser } = build(false);

    await avisar(FORNECEDOR);

    expect(notifyUser.mock.calls[0][1]).toMatch(/cliente não consegue concluir o pagamento/);
    expect(notifyUser.mock.calls[0][1]).toMatch(/Mercado Pago/);
  });

  it('não avisa quem já tem conta vinculada', async () => {
    const { avisar, notifyUser } = build(true);

    await avisar(FORNECEDOR);

    expect(notifyUser).not.toHaveBeenCalled();
  });

  it('decide pelo status do vínculo, não por conta própria', async () => {
    // A regra do que conta como "vinculado" mora no `MercadoPagoAccountsService`.
    // Duplicá-la aqui faria o aviso divergir do que o pagamento exige.
    const { avisar, status } = build(true);

    await avisar(FORNECEDOR);

    expect(status).toHaveBeenCalledWith(FORNECEDOR);
  });

  it('não lança nem derruba o processo quando a notificação falha', async () => {
    // Notificação é acessório: falhar aqui não pode derrubar a assinatura que
    // o fornecedor acabou de pagar. Sem o `.catch` local, `void` numa promessa
    // rejeitada vira unhandled rejection e mata o processo — foi o que este
    // teste pegou na primeira execução.
    const { avisar, notifyUser } = build(false);
    notifyUser.mockRejectedValue(new Error('WhatsApp fora do ar'));

    await expect(avisar(FORNECEDOR)).resolves.toBeUndefined();
  });
});

/**
 * O aviso tem de estar **ligado** ao fluxo: um mutante que apagou a chamada de
 * dentro do `create` não quebrou nada, porque os testes acima exercitam o
 * método privado direto. Este monta a assinatura inteira para fixar a ligação.
 */
describe('o aviso está ligado ao fluxo da assinatura', () => {
  function buildCreate(isLinked: boolean) {
    const notifyUser = jest.fn().mockResolvedValue(undefined);
    const tx = {
      address: { create: jest.fn() },
      subscription: { create: jest.fn().mockResolvedValue({ id: 50 }) },
      payment: { create: jest.fn() },
    };

    const prisma = {
      plan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Essencial',
          price: new Prisma.Decimal('99.90'),
          interval: 'Month',
          intervalCount: 1,
          bonusMonths: 0,
          isActive: true,
          categoryId: 3,
        }),
      },
      serviceCategory: { findFirst: jest.fn().mockResolvedValue({ id: 3, name: 'Pintor' }) },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;

    const service = new SubscriptionsService(
      prisma,
      {
        createPreference: jest
          .fn()
          .mockResolvedValue({ preferenceId: 'PREF', checkoutUrl: 'https://mp' }),
      } as unknown as MercadoPagoService,
      { notifyUser } as unknown as NotificationsService,
      {
        status: jest.fn().mockResolvedValue({ isLinked }),
      } as unknown as MercadoPagoAccountsService,
      {} as PlansService,
    );

    jest.spyOn(service, 'findById').mockResolvedValue({ id: 50 } as never);

    return { service, notifyUser };
  }

  const PEDIDO = { planId: 1, categoryId: 3 } as CreateSubscriptionDto;

  it('avisa ao criar assinatura de quem não tem conta vinculada', async () => {
    const { service, notifyUser } = buildCreate(false);

    await service.create(FORNECEDOR, PEDIDO);

    expect(notifyUser).toHaveBeenCalledTimes(1);
  });

  it('não avisa ao criar assinatura de quem já tem conta', async () => {
    const { service, notifyUser } = buildCreate(true);

    await service.create(FORNECEDOR, PEDIDO);

    expect(notifyUser).not.toHaveBeenCalled();
  });

  it('a assinatura é criada mesmo sem o vínculo: avisa, não bloqueia', async () => {
    // Travar a assinatura por falta de vínculo impediria de pagar justamente
    // quem está começando a operar.
    const { service } = buildCreate(false);

    const resposta = await service.create(FORNECEDOR, PEDIDO);

    expect(resposta.checkoutUrl).toBe('https://mp');
    expect(resposta.subscription).toEqual({ id: 50 });
  });
});
