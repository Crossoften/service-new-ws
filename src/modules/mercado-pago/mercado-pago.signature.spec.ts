import { createHmac } from 'crypto';
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
