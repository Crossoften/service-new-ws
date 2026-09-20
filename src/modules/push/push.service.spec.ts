import { PrismaService } from '@database/PrismaService';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';

import { PushService } from './push.service';

// Chaves VAPID reais são pares de curva elíptica; o `setVapidDetails` valida o
// formato. Geramos um par de verdade uma vez para o teste.
const CHAVES = webPush.generateVAPIDKeys();

const ENV_COMPLETO: Record<string, string | undefined> = {
  VAPID_SUBJECT: 'mailto:contato@example.com',
  VAPID_PUBLIC_KEY: CHAVES.publicKey,
  VAPID_PRIVATE_KEY: CHAVES.privateKey,
};

function build(env = ENV_COMPLETO, inscricoes: Record<string, unknown>[] = []) {
  const deleteFn = jest.fn().mockResolvedValue({});
  const updateFn = jest.fn().mockResolvedValue({});
  const prisma = {
    pushSubscription: {
      findMany: jest.fn().mockResolvedValue(inscricoes),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: deleteFn,
      update: updateFn,
    },
  } as unknown as PrismaService;

  const configService = { get: (k: string) => env[k] } as unknown as ConfigService;

  return { service: new PushService(configService, prisma), prisma, deleteFn, updateFn };
}

const INSCRICAO = {
  id: 1,
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'chave-publica',
  auth: 'segredo',
};

afterEach(() => jest.restoreAllMocks());

describe('PushService — configuração', () => {
  it('fica habilitado com as três variáveis', () => {
    expect(build().service.isConfigured()).toBe(true);
  });

  it('fica desabilitado sem a chave privada', () => {
    expect(build({ ...ENV_COMPLETO, VAPID_PRIVATE_KEY: undefined }).service.isConfigured()).toBe(
      false,
    );
  });

  it('não devolve chave pública quando desabilitado', () => {
    expect(build({}).service.getPublicKey()).toBeNull();
  });

  it('devolve a chave pública quando habilitado — é ela que o navegador usa', () => {
    expect(build().service.getPublicKey()).toBe(CHAVES.publicKey);
  });
});

describe('PushService — envio', () => {
  it('não tenta enviar quando não há configuração', async () => {
    const enviar = jest.spyOn(webPush, 'sendNotification');
    const { service } = build({}, [INSCRICAO]);

    await service.notifyUser(1, { title: 'Oi', body: 'Teste' });

    expect(enviar).not.toHaveBeenCalled();
  });

  it('envia para todos os aparelhos do usuário', async () => {
    const enviar = jest.spyOn(webPush, 'sendNotification').mockResolvedValue({} as never);
    const { service } = build(ENV_COMPLETO, [INSCRICAO, { ...INSCRICAO, id: 2, endpoint: 'x' }]);

    await service.notifyUser(1, { title: 'Oi', body: 'Teste' });

    expect(enviar).toHaveBeenCalledTimes(2);
  });

  it('manda título e corpo como JSON, para o service worker ler', async () => {
    const enviar = jest.spyOn(webPush, 'sendNotification').mockResolvedValue({} as never);
    const { service } = build(ENV_COMPLETO, [INSCRICAO]);

    await service.notifyUser(1, {
      title: 'Pedido a caminho',
      body: 'Saiu para entrega',
      url: '/p/1',
    });

    expect(JSON.parse(enviar.mock.calls[0][1] as string)).toEqual({
      title: 'Pedido a caminho',
      body: 'Saiu para entrega',
      url: '/p/1',
    });
  });

  it('apaga a inscrição quando o navegador responde 410', async () => {
    jest
      .spyOn(webPush, 'sendNotification')
      .mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));
    const { service, deleteFn } = build(ENV_COMPLETO, [INSCRICAO]);

    await service.notifyUser(1, { title: 'Oi', body: 'Teste' });

    // Inscrição morta mantida faria o servidor tentar entregar para sempre, a
    // cada evento, para um aparelho que não existe mais.
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('apaga também no 404', async () => {
    jest
      .spyOn(webPush, 'sendNotification')
      .mockRejectedValue(Object.assign(new Error('Not Found'), { statusCode: 404 }));
    const { service, deleteFn } = build(ENV_COMPLETO, [INSCRICAO]);

    await service.notifyUser(1, { title: 'Oi', body: 'Teste' });

    expect(deleteFn).toHaveBeenCalled();
  });

  it('NÃO apaga em falha passageira do provedor', async () => {
    jest
      .spyOn(webPush, 'sendNotification')
      .mockRejectedValue(Object.assign(new Error('Service Unavailable'), { statusCode: 503 }));
    const { service, deleteFn } = build(ENV_COMPLETO, [INSCRICAO]);

    await service.notifyUser(1, { title: 'Oi', body: 'Teste' });

    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('não propaga falha: notificação não pode derrubar a operação que a disparou', async () => {
    jest.spyOn(webPush, 'sendNotification').mockRejectedValue(new Error('boom'));
    const { service } = build(ENV_COMPLETO, [INSCRICAO]);

    await expect(service.notifyUser(1, { title: 'Oi', body: 'Teste' })).resolves.toBeUndefined();
  });

  it('um aparelho com problema não impede os outros de receber', async () => {
    const enviar = jest
      .spyOn(webPush, 'sendNotification')
      .mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }))
      .mockResolvedValueOnce({} as never);
    const { service } = build(ENV_COMPLETO, [INSCRICAO, { ...INSCRICAO, id: 2, endpoint: 'y' }]);

    await service.notifyUser(1, { title: 'Oi', body: 'Teste' });

    expect(enviar).toHaveBeenCalledTimes(2);
  });
});
