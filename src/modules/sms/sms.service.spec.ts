import { SmsService } from './sms.service';

const build = (accountSid?: string): SmsService =>
  new SmsService({
    get: (key: string) =>
      ({
        TWILIO_ACCOUNT_SID: accountSid,
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_PHONE_NUMBER: '+10000000000',
      })[key],
  } as never);

describe('SmsService', () => {
  it('não derruba a aplicação com o placeholder do .env.example', () => {
    // Regressão: o SDK do Twilio lança se o SID não começa com "AC", e o
    // construtor era executado no bootstrap — a API inteira não subia.
    expect(() => build('seu_twilio_account_sid')).not.toThrow();
    expect(build('seu_twilio_account_sid').hasCredentials()).toBe(false);
  });

  it('fica desabilitado quando a variável está ausente', () => {
    expect(() => build(undefined)).not.toThrow();
    expect(build(undefined).hasCredentials()).toBe(false);
  });

  it('habilita com SID em formato válido', () => {
    expect(build('ACdeadbeefdeadbeefdeadbeefdeadbeef').hasCredentials()).toBe(true);
  });
});

describe('SmsService — mensagens por tipo de código', () => {
  function capturarEnvio(service: SmsService) {
    const enviadas: Array<{ to: string; body: string }> = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).client = {
      messages: {
        create: async (params: { to: string; body: string }) => {
          enviadas.push(params);
          return {};
        },
      },
    };

    return enviadas;
  }

  it('a recuperação de senha e a verificação de conta usam textos diferentes', async () => {
    const service = build('AC' + '0'.repeat(32));
    const enviadas = capturarEnvio(service);

    await service.sendPasswordResetCode('+5534998701109', '111111');
    await service.sendAccountVerificationCode('+5534998701109', '222222');

    expect(enviadas).toHaveLength(2);
    expect(enviadas[0].body).toContain('recuperação de senha');
    expect(enviadas[0].body).toContain('111111');
    expect(enviadas[1].body).toContain('confirmar seu cadastro');
    expect(enviadas[1].body).toContain('222222');
    expect(enviadas[0].body).not.toEqual(enviadas[1].body);
  });

  // Regressão: a mensagem de erro era específica da recuperação de senha
  // ("use o e-mail") e passou a servir também ao cadastro, onde não cabe.
  it('a falha de envio não sugere e-mail como alternativa', async () => {
    const service = build('AC' + '0'.repeat(32));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).client = {
      messages: {
        create: async () => {
          throw Object.assign(new Error('boom'), { code: 21211 });
        },
      },
    };

    await expect(service.sendAccountVerificationCode('+5534998701109', '123456')).rejects.toThrow(
      /Não foi possível enviar o SMS/,
    );

    await expect(service.sendPasswordResetCode('+5534998701109', '123456')).rejects.not.toThrow(
      /e-mail/,
    );
  });
});
