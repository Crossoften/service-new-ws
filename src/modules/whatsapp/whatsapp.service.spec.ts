import { PrismaService } from '@database/PrismaService';
import { ConfigService } from '@nestjs/config';

import { WhatsappService } from './whatsapp.service';

type Env = Record<string, string | undefined>;

const ENV_COMPLETO: Env = {
  TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
  TWILIO_AUTH_TOKEN: 'token-de-teste',
  TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
  TWILIO_WHATSAPP_CONTENT_SID: 'HX00000000000000000000000000000000',
  TWILIO_WHATSAPP_OTP_CONTENT_SID: 'HX11111111111111111111111111111111',
};

function build(overrides: Env = {}): WhatsappService {
  const env: Env = { ...ENV_COMPLETO, ...overrides };
  const configService = { get: (chave: string) => env[chave] } as unknown as ConfigService;
  const prisma = { user: { findUnique: jest.fn() } } as unknown as PrismaService;

  return new WhatsappService(configService, prisma);
}

/**
 * Substitui o client do Twilio por um duplo que apenas registra o payload,
 * evitando qualquer chamada de rede nos testes.
 */
function capturarEnvio(service: WhatsappService) {
  const create = jest.fn().mockResolvedValue({ sid: 'SM123' });

  (service as unknown as { client: unknown }).client = { messages: { create } };

  return create;
}

describe('WhatsappService (Twilio)', () => {
  it('não derruba o bootstrap quando o SID está com o placeholder do .env.example', () => {
    expect(() => build({ TWILIO_ACCOUNT_SID: 'seu_account_sid_aqui' })).not.toThrow();
    expect(build({ TWILIO_ACCOUNT_SID: 'seu_account_sid_aqui' }).hasCredentials()).toBe(false);
  });

  it('fica desabilitado sem o content sid do template', () => {
    expect(build({ TWILIO_WHATSAPP_CONTENT_SID: undefined }).hasCredentials()).toBe(false);
  });

  it('fica desabilitado sem o número remetente', () => {
    expect(build({ TWILIO_WHATSAPP_FROM: undefined }).hasCredentials()).toBe(false);
  });

  it('fica habilitado com as variáveis de notificação presentes', () => {
    expect(build().hasCredentials()).toBe(true);
  });

  it('envia para o endereço no formato whatsapp:E.164', async () => {
    const service = build();
    const create = capturarEnvio(service);

    await service.sendMessage('(34) 99870-1109', 'Pedido confirmado');

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      from: ENV_COMPLETO.TWILIO_WHATSAPP_FROM,
      to: 'whatsapp:+5534998701109',
      contentSid: ENV_COMPLETO.TWILIO_WHATSAPP_CONTENT_SID,
    });
  });

  it('converge formatos diferentes do mesmo número para o mesmo destino', async () => {
    const destinos: string[] = [];

    for (const entrada of ['34998701109', '(34) 99870-1109', '+55 34 99870-1109']) {
      const service = build();
      const create = capturarEnvio(service);

      await service.sendMessage(entrada, 'oi');
      destinos.push(create.mock.calls[0][0].to);
    }

    expect(new Set(destinos).size).toBe(1);
    expect(destinos[0]).toBe('whatsapp:+5534998701109');
  });

  it('envia o texto como variável 1 do template', async () => {
    const service = build();
    const create = capturarEnvio(service);

    await service.sendMessage('34998701109', 'Sua entrega saiu para o endereço');

    expect(JSON.parse(create.mock.calls[0][0].contentVariables)).toEqual({
      '1': 'Sua entrega saiu para o endereço',
    });
  });

  it('achata quebras de linha em espaço para não invalidar a substituição', async () => {
    const service = build();
    const create = capturarEnvio(service);

    await service.sendMessage('34998701109', 'Linha 1\nLinha 2\r\nLinha 3');

    expect(JSON.parse(create.mock.calls[0][0].contentVariables)).toEqual({
      '1': 'Linha 1 Linha 2 Linha 3',
    });
  });

  it('ignora o envio quando o telefone não é normalizável', async () => {
    const service = build();
    const create = capturarEnvio(service);

    await service.sendMessage('123', 'Pedido confirmado');

    expect(create).not.toHaveBeenCalled();
  });

  it('ignora o envio quando a mensagem fica vazia', async () => {
    const service = build();
    const create = capturarEnvio(service);

    await service.sendMessage('34998701109', '   \n  ');

    expect(create).not.toHaveBeenCalled();
  });

  it('separa o template de OTP do de notificação', () => {
    expect(build({ TWILIO_WHATSAPP_OTP_CONTENT_SID: undefined }).hasCredentials()).toBe(true);
    expect(build({ TWILIO_WHATSAPP_OTP_CONTENT_SID: undefined }).hasOtpCredentials()).toBe(false);
    expect(build({ TWILIO_WHATSAPP_CONTENT_SID: undefined }).hasOtpCredentials()).toBe(true);
  });

  it('manda só o código na variável 1 do template de OTP', async () => {
    const service = build();
    const create = capturarEnvio(service);

    await service.sendVerificationCode('(34) 99870-1109', '123456');

    expect(create.mock.calls[0][0]).toMatchObject({
      to: 'whatsapp:+5534998701109',
      contentSid: ENV_COMPLETO.TWILIO_WHATSAPP_OTP_CONTENT_SID,
    });
    expect(JSON.parse(create.mock.calls[0][0].contentVariables)).toEqual({ '1': '123456' });
  });

  it('propaga a falha no código de verificação: o SMS precisa saber que deve assumir', async () => {
    const service = build();
    const create = capturarEnvio(service);

    create.mockRejectedValue(Object.assign(new Error('63016'), { code: 63016 }));

    await expect(service.sendVerificationCode('34998701109', '123456')).rejects.toThrow();
  });

  it('recusa o código de verificação sem o template de OTP, em vez de usar o de notificação', async () => {
    const service = build({ TWILIO_WHATSAPP_OTP_CONTENT_SID: undefined });
    const create = capturarEnvio(service);

    await expect(service.sendVerificationCode('34998701109', '123456')).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it('recusa o código de verificação quando o telefone não é normalizável', async () => {
    const service = build();
    const create = capturarEnvio(service);

    await expect(service.sendVerificationCode('123', '123456')).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it('não propaga falha do provedor: notificação é acessório', async () => {
    const service = build();
    const create = capturarEnvio(service);

    create.mockRejectedValue(Object.assign(new Error('63016'), { code: 63016 }));

    await expect(service.sendMessage('34998701109', 'Pedido confirmado')).resolves.toBeUndefined();
  });
});
