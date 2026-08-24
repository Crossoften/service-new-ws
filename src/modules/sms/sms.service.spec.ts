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
