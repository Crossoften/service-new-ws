import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantAddressDto } from './dto/restaurant-address.dto';

async function propriedadesInvalidas(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(RestaurantAddressDto, payload);

  return (await validate(dto)).map((falha) => falha.property);
}

describe('RestaurantAddressDto', () => {
  it('aceita endereço completo com coordenadas', async () => {
    expect(
      await propriedadesInvalidas({
        street: 'Avenida Rondon Pacheco',
        number: '1200',
        city: 'Uberlândia',
        latitude: -18.9146,
        longitude: -48.2754,
      }),
    ).toEqual([]);
  });

  it('aceita endereço sem coordenadas: o frete cai na faixa padrão, mas não é erro', async () => {
    expect(await propriedadesInvalidas({ street: 'Avenida Rondon Pacheco' })).toEqual([]);
  });

  it('converte coordenada enviada como texto pela geocodificação', async () => {
    const dto = plainToInstance(RestaurantAddressDto, { latitude: '-18.9146' });

    expect(await validate(dto)).toEqual([]);
    expect(dto.latitude).toBe(-18.9146);
  });

  it('recusa coordenada fora da faixa', async () => {
    expect(await propriedadesInvalidas({ latitude: -91 })).toContain('latitude');
    expect(await propriedadesInvalidas({ longitude: 181 })).toContain('longitude');
  });
});

describe('CreateRestaurantDto — endereço aninhado', () => {
  it('valida o endereço junto com o restaurante', async () => {
    const dto = plainToInstance(CreateRestaurantDto, {
      name: 'Cantina',
      categoryId: 1,
      address: { latitude: 999 },
    });

    const falhas = await validate(dto);

    // Sem `@ValidateNested`, o objeto aninhado passaria sem nenhuma checagem e
    // a coordenada inválida só estouraria no banco.
    expect(falhas.map((f) => f.property)).toContain('address');
  });

  it('deixa passar restaurante sem endereço: é opcional', async () => {
    const dto = plainToInstance(CreateRestaurantDto, { name: 'Cantina', categoryId: 1 });

    expect(await validate(dto)).toEqual([]);
  });
});
