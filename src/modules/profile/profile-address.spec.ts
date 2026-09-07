import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { UpdateAddressDto } from './dto/update-address-dto';

async function erros(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(UpdateAddressDto, payload);
  const falhas = await validate(dto);

  return falhas.flatMap((f) => Object.keys(f.constraints ?? {}).map(() => f.property));
}

describe('UpdateAddressDto — coordenadas', () => {
  it('aceita coordenadas válidas', async () => {
    expect(await erros({ latitude: -18.9186, longitude: -48.2772 })).toEqual([]);
  });

  it('aceita endereço sem coordenadas: os antigos não têm', async () => {
    expect(await erros({ street: 'Rua das Palmeiras' })).toEqual([]);
  });

  it('converte coordenada enviada como texto', async () => {
    // O front costuma mandar o que a geocodificação devolveu, sem converter.
    const dto = plainToInstance(UpdateAddressDto, { latitude: '-18.9186', longitude: '-48.2772' });

    expect(await validate(dto)).toEqual([]);
    expect(dto.latitude).toBe(-18.9186);
    expect(typeof dto.latitude).toBe('number');
  });

  it('recusa latitude fora da faixa', async () => {
    expect(await erros({ latitude: 91, longitude: -48.2772 })).toContain('latitude');
  });

  it('recusa longitude fora da faixa', async () => {
    expect(await erros({ latitude: -18.9186, longitude: 181 })).toContain('longitude');
  });

  it('recusa coordenada que não é número', async () => {
    expect(await erros({ latitude: 'centro da cidade' })).toContain('latitude');
  });
});
