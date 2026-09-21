import { SmsService } from '../sms/sms.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { VerificationCodeService } from './verification-code.service';

interface Duplos {
  service: VerificationCodeService;
  enviarWhatsapp: jest.Mock;
  enviarSmsVerificacao: jest.Mock;
  enviarSmsReset: jest.Mock;
}

function build(opcoes: { whatsapp?: boolean; sms?: boolean } = {}): Duplos {
  const comWhatsapp = opcoes.whatsapp ?? true;
  const comSms = opcoes.sms ?? true;

  const enviarWhatsapp = jest.fn().mockResolvedValue(undefined);
  const enviarSmsVerificacao = jest.fn().mockResolvedValue(undefined);
  const enviarSmsReset = jest.fn().mockResolvedValue(undefined);

  const whatsappService = {
    hasOtpCredentials: () => comWhatsapp,
    sendVerificationCode: enviarWhatsapp,
  } as unknown as WhatsappService;

  const smsService = {
    hasCredentials: () => comSms,
    sendAccountVerificationCode: enviarSmsVerificacao,
    sendPasswordResetCode: enviarSmsReset,
  } as unknown as SmsService;

  return {
    service: new VerificationCodeService(whatsappService, smsService),
    enviarWhatsapp,
    enviarSmsVerificacao,
    enviarSmsReset,
  };
}

describe('VerificationCodeService', () => {
  it('tenta o WhatsApp primeiro e não gasta SMS quando ele aceita', async () => {
    const { service, enviarWhatsapp, enviarSmsVerificacao } = build();

    await service.sendAccountVerificationCode('+5534998701109', '123456');

    expect(enviarWhatsapp).toHaveBeenCalledWith('+5534998701109', '123456');
    expect(enviarSmsVerificacao).not.toHaveBeenCalled();
  });

  it('cai para o SMS quando o WhatsApp falha, sem propagar o erro', async () => {
    const { service, enviarWhatsapp, enviarSmsVerificacao } = build();

    enviarWhatsapp.mockRejectedValue(new Error('63016'));

    await expect(
      service.sendAccountVerificationCode('+5534998701109', '123456'),
    ).resolves.toBeUndefined();

    expect(enviarSmsVerificacao).toHaveBeenCalledWith('+5534998701109', '123456');
  });

  it('entrega o mesmo código pelos dois canais: o fallback não regenera nada', async () => {
    const { service, enviarWhatsapp, enviarSmsReset } = build();

    enviarWhatsapp.mockRejectedValue(new Error('fora do ar'));

    await service.sendPasswordResetCode('+5534998701109', '999888');

    expect(enviarWhatsapp.mock.calls[0][1]).toBe('999888');
    expect(enviarSmsReset.mock.calls[0][1]).toBe('999888');
  });

  it('propaga a falha quando o SMS também falha: o chamador não pode gravar o código', async () => {
    const { service, enviarWhatsapp, enviarSmsVerificacao } = build();

    enviarWhatsapp.mockRejectedValue(new Error('whatsapp fora'));
    enviarSmsVerificacao.mockRejectedValue(new Error('sms fora'));

    await expect(service.sendAccountVerificationCode('+5534998701109', '123456')).rejects.toThrow(
      'sms fora',
    );
  });

  it('forceSms pula o WhatsApp: é o escape de quem não recebeu o primeiro código', async () => {
    const { service, enviarWhatsapp, enviarSmsVerificacao } = build();

    await service.sendAccountVerificationCode('+5534998701109', '123456', { forceSms: true });

    expect(enviarWhatsapp).not.toHaveBeenCalled();
    expect(enviarSmsVerificacao).toHaveBeenCalledTimes(1);
  });

  it('ignora o forceSms quando não há SMS configurado, em vez de não enviar nada', async () => {
    const { service, enviarWhatsapp, enviarSmsVerificacao } = build({ sms: false });

    await service.sendAccountVerificationCode('+5534998701109', '123456', { forceSms: true });

    expect(enviarWhatsapp).toHaveBeenCalledTimes(1);
    expect(enviarSmsVerificacao).not.toHaveBeenCalled();
  });

  it('vai direto ao SMS enquanto o template de OTP não estiver configurado', async () => {
    const { service, enviarWhatsapp, enviarSmsVerificacao } = build({ whatsapp: false });

    await service.sendAccountVerificationCode('+5534998701109', '123456');

    expect(enviarWhatsapp).not.toHaveBeenCalled();
    expect(enviarSmsVerificacao).toHaveBeenCalledTimes(1);
  });

  it('basta um canal para o forgot seguir em frente', () => {
    expect(build({ whatsapp: false, sms: true }).service.hasCredentials()).toBe(true);
    expect(build({ whatsapp: true, sms: false }).service.hasCredentials()).toBe(true);
    expect(build({ whatsapp: false, sms: false }).service.hasCredentials()).toBe(false);
  });
});
