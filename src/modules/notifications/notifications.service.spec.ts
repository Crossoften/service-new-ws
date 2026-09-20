import { NotificationsService } from './notifications.service';

function build(whatsappFalha = false, pushFalha = false) {
  const whatsapp = jest
    .fn()
    .mockImplementation(() =>
      whatsappFalha ? Promise.reject(new Error('whatsapp fora')) : Promise.resolve(),
    );
  const push = jest
    .fn()
    .mockImplementation(() =>
      pushFalha ? Promise.reject(new Error('push fora')) : Promise.resolve(),
    );

  const service = new NotificationsService(
    { notifyUser: whatsapp } as never,
    { notifyUser: push } as never,
  );

  return { service, whatsapp, push };
}

describe('NotificationsService', () => {
  it('avisa pelos dois canais', async () => {
    const { service, whatsapp, push } = build();

    await service.notifyUser(7, 'Seu pedido saiu para entrega.');

    expect(whatsapp).toHaveBeenCalledWith(7, 'Seu pedido saiu para entrega.');
    expect(push).toHaveBeenCalledWith(7, {
      title: 'Service',
      body: 'Seu pedido saiu para entrega.',
    });
  });

  it('aceita título próprio para a notificação', async () => {
    const { service, push } = build();

    await service.notifyUser(7, 'Saiu para entrega', 'Pedido #12');

    expect(push.mock.calls[0][1]).toMatchObject({ title: 'Pedido #12' });
  });

  it('WhatsApp fora do ar não impede o push', async () => {
    const { service, push } = build(true, false);

    await expect(service.notifyUser(7, 'Teste')).resolves.toBeUndefined();
    expect(push).toHaveBeenCalled();
  });

  it('push fora do ar não impede o WhatsApp', async () => {
    const { service, whatsapp } = build(false, true);

    await expect(service.notifyUser(7, 'Teste')).resolves.toBeUndefined();
    expect(whatsapp).toHaveBeenCalled();
  });

  it('os dois canais fora do ar não derrubam a operação que disparou o aviso', async () => {
    const { service } = build(true, true);

    // É a regra que atravessa o projeto: notificação é acessório e não pode
    // derrubar o pedido, o pagamento ou a entrega.
    await expect(service.notifyUser(7, 'Teste')).resolves.toBeUndefined();
  });
});
