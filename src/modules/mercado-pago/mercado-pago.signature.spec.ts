import { createHmac } from 'crypto';
import { Preference } from 'mercadopago';
import { MercadoPagoService } from './mercado-pago.service';

const build = (secret?: string): MercadoPagoService =>
  new MercadoPagoService({
    get: (key: string) => ({ MERCADOPAGO_WEBHOOK_SECRET: secret })[key],
  } as never);

const assinar = (secret: string, dataId: string, requestId: string, ts: string): string => {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${hash}`;
};

describe('MercadoPagoService.verifySignature', () => {
  const SECRET = 'segredo-de-teste';

  it('aceita assinatura válida', () => {
    const xSignature = assinar(SECRET, '123', 'req-1', '1700000000');
    expect(build(SECRET).verifySignature(xSignature, 'req-1', '123')).toBe(true);
  });

  it('REJEITA quando o header de assinatura não vem', () => {
    // Regressão: a versão anterior devolvia `true` aqui, então bastava omitir o
    // header x-signature para contornar a verificação inteira.
    expect(build(SECRET).verifySignature(undefined, 'req-1', '123')).toBe(false);
  });

  it('rejeita hash inválido', () => {
    expect(build(SECRET).verifySignature('ts=1,v1=deadbeef', 'req-1', '123')).toBe(false);
  });

  it('rejeita assinatura malformada', () => {
    expect(build(SECRET).verifySignature('sem-formato', 'req-1', '123')).toBe(false);
  });

  it('rejeita assinatura de outro dataId', () => {
    const xSignature = assinar(SECRET, '999', 'req-1', '1700000000');
    expect(build(SECRET).verifySignature(xSignature, 'req-1', '123')).toBe(false);
  });

  it('não verifica quando o segredo não está configurado', () => {
    // Ambiente local sem credencial: a verificação fica desligada de propósito.
    expect(build(undefined).verifySignature(undefined, undefined, '123')).toBe(true);
  });
});

describe('MercadoPagoService.createPreference — retenção da plataforma', () => {
  function buildComGateway(): { service: MercadoPagoService; create: jest.Mock } {
    const service = new MercadoPagoService({
      get: (key: string) => ({ MERCADOPAGO_ACCESS_TOKEN: 'token-da-plataforma' })[key],
    } as never);

    const create = jest.fn().mockResolvedValue({ id: 'pref-1', init_point: 'https://mp/x' });

    // Substitui só a chamada de rede; o cálculo da retenção continua o real.
    jest.spyOn(Preference.prototype, 'create').mockImplementation(create);

    return { service, create };
  }

  afterEach(() => jest.restoreAllMocks());

  it('usa o valor absoluto quando informado, ignorando o percentual', async () => {
    const { service, create } = buildComGateway();

    await service.createPreference({
      title: 'Pedido #1',
      unitPrice: 58,
      externalReference: 'ref-1',
      sellerAccessToken: 'token-do-vendedor',
      marketplaceFeeRate: 20,
      marketplaceFeeAmount: 18,
    });

    // O percentual daria 11,60 sobre o total. O absoluto é comissão sobre os
    // itens mais o frete inteiro — é ele que precisa valer.
    expect(create.mock.calls[0][0].body.marketplace_fee).toBe(18);
  });

  it('cai no percentual quando não há valor absoluto', async () => {
    const { service, create } = buildComGateway();

    await service.createPreference({
      title: 'Trabalho #1',
      unitPrice: 100,
      externalReference: 'ref-2',
      sellerAccessToken: 'token-do-vendedor',
      marketplaceFeeRate: 20,
    });

    expect(create.mock.calls[0][0].body.marketplace_fee).toBe(20);
  });

  it('não retém nada sem token do vendedor: sem split não há terceiro de quem reter', async () => {
    const { service, create } = buildComGateway();

    await service.createPreference({
      title: 'Assinatura',
      unitPrice: 100,
      externalReference: 'ref-3',
      marketplaceFeeAmount: 50,
    });

    expect(create.mock.calls[0][0].body.marketplace_fee).toBeUndefined();
  });
});
