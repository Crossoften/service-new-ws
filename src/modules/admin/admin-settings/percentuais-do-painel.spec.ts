import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdatePlatformSettingsDto } from './dto/platform-settings.dto';

/**
 * Os percentuais do painel usavam `@IsDecimal()`, que delega ao `validator.js`
 * e **só valida string**: `{ "influencerCommissionRate": 12.5 }` era recusado
 * com "is not a valid decimal number", e é exatamente isso que o Web Admin
 * manda (`Number(...)` no submit). A tela de comissão global não salvava.
 *
 * Na outra ponta não havia faixa: `"500"` passava, e 500% podia ser gravado em
 * campo de dinheiro.
 */
async function invalidos(corpo: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(UpdatePlatformSettingsDto, corpo);

  return (await validate(dto as object)).map((erro) => erro.property);
}

const CAMPOS = [
  'influencerCommissionRate',
  'marketplaceFeeRate',
  'deliveryCommissionRate',
] as const;

describe('percentuais do painel administrativo', () => {
  it.each(CAMPOS)('aceita %s como número, que é o que o admin manda', async (campo) => {
    expect(await invalidos({ [campo]: 12.5 })).toEqual([]);
  });

  it.each(CAMPOS)('aceita %s como texto numérico', async (campo) => {
    expect(await invalidos({ [campo]: '12.5' })).toEqual([]);
  });

  it.each(CAMPOS)('converte o texto de %s para número antes de gravar', async (campo) => {
    const dto = plainToInstance(UpdatePlatformSettingsDto, { [campo]: '12.5' });

    expect(dto[campo]).toBe(12.5);
  });

  it.each(CAMPOS)('aceita os extremos 0 e 100 em %s', async (campo) => {
    expect(await invalidos({ [campo]: 0 })).toEqual([]);
    expect(await invalidos({ [campo]: 100 })).toEqual([]);
  });

  it.each(CAMPOS)('recusa %s acima de 100', async (campo) => {
    expect(await invalidos({ [campo]: 500 })).toContain(campo);
    expect(await invalidos({ [campo]: '500' })).toContain(campo);
  });

  it.each(CAMPOS)('recusa %s negativo', async (campo) => {
    expect(await invalidos({ [campo]: -1 })).toContain(campo);
  });

  it.each(CAMPOS)('recusa mais de duas casas em %s', async (campo) => {
    expect(await invalidos({ [campo]: 12.555 })).toContain(campo);
  });

  it.each(CAMPOS)('recusa texto não numérico em %s', async (campo) => {
    expect(await invalidos({ [campo]: 'abc' })).toContain(campo);
  });

  it('todos são opcionais: um PATCH pode mandar só um campo', async () => {
    expect(await invalidos({})).toEqual([]);
    expect(await invalidos({ deliveryCommissionRate: 17 })).toEqual([]);
  });
});
