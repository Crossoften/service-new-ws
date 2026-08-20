import { ConfigService } from '@nestjs/config';
import { Status } from '@prisma/client';
import Twilio = require('twilio');
import { PrismaService } from '@database/PrismaService';
import { WhatsappService } from './whatsapp.service';

const mockCreateMessage = jest.fn();

jest.mock('twilio', () =>
  jest.fn(() => ({
    messages: {
      create: mockCreateMessage,
    },
  })),
);

describe('WhatsappService', () => {
  const configValues = {
    TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
    TWILIO_AUTH_TOKEN: 'token',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    TWILIO_WHATSAPP_CONTENT_SID: 'HX00000000000000000000000000000000',
  };

  const createService = (values = configValues) => {
    const configService = {
      get: jest.fn((key: string) => values[key as keyof typeof values]),
    } as unknown as ConfigService;
    const prisma = {
      user: {
        findUnique: jest.fn(),
      },
    } as unknown as PrismaService;

    return {
      service: new WhatsappService(configService, prisma),
      prisma,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMessage.mockResolvedValue({ sid: 'SM00000000000000000000000000000000' });
  });

  it('envia template pelo Twilio e normaliza telefone brasileiro formatado', async () => {
    const { service } = createService();

    await service.sendMessage('(34) 9 9290-0000', 'Pagamento confirmado.');

    expect(mockCreateMessage).toHaveBeenCalledWith({
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+5534992900000',
      contentSid: 'HX00000000000000000000000000000000',
      contentVariables: JSON.stringify({ 1: 'Pagamento confirmado.' }),
    });
  });

  it('mantém o código do país já informado', async () => {
    const { service } = createService();

    await service.sendMessage('+55 (34) 9 9290-0000', 'Atualização disponível.');

    expect(mockCreateMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'whatsapp:+5534992900000' }),
    );
  });

  it.each(['', 'abc', '123', '+55 34 9290'])('ignora telefone inválido: %s', async (phone) => {
    const { service } = createService();

    await service.sendMessage(phone, 'Mensagem de teste.');

    expect(mockCreateMessage).not.toHaveBeenCalled();
  });

  it('ignora mensagem vazia e remove quebras de linha do conteúdo', async () => {
    const { service } = createService();

    await service.sendMessage('34992900000', '  Primeira linha\nSegunda linha  ');
    await service.sendMessage('34992900000', '   ');

    expect(mockCreateMessage).toHaveBeenCalledTimes(1);
    expect(mockCreateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        contentVariables: JSON.stringify({ 1: 'Primeira linha Segunda linha' }),
      }),
    );
  });

  it('não envia quando as credenciais ou o template não estão configurados', async () => {
    const { service } = createService({
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
      TWILIO_WHATSAPP_CONTENT_SID: 'HX00000000000000000000000000000000',
    });

    await service.sendMessage('34992900000', 'Mensagem de teste.');

    expect(mockCreateMessage).not.toHaveBeenCalled();
    expect(Twilio).not.toHaveBeenCalled();
  });

  it('não propaga falha do SDK para o fluxo assíncrono', async () => {
    mockCreateMessage.mockRejectedValueOnce(new Error('Falha simulada no Twilio'));
    const { service } = createService();

    await expect(service.sendMessage('34992900000', 'Mensagem de teste.')).resolves.toBeUndefined();
  });

  it('notifica apenas usuários ativos com telefone', async () => {
    const { service, prisma } = createService();
    const findUnique = prisma.user.findUnique as jest.Mock;
    findUnique.mockResolvedValue({ phone: '34992900000', status: Status.Active });

    await service.notifyUser(7, 'Você tem uma atualização.');

    expect(mockCreateMessage).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { phone: true, status: true },
    });

    findUnique.mockResolvedValue({ phone: '34992900000', status: Status.Inactive });
    await service.notifyUser(8, 'Você tem uma atualização.');

    expect(mockCreateMessage).toHaveBeenCalledTimes(1);
  });
});
