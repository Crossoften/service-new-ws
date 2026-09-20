import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateFoodOrderDto } from './dto/create-food-order.dto';
import { DeliveryAddressDto } from './dto/delivery-address.dto';

const PEDIDO_MINIMO = {
  restaurantId: 1,
  paymentMethod: 'Cash',
  items: [{ menuItemId: 1, quantity: 1 }],
};

async function propriedadesInvalidas(payload: Record<string, unknown>): Promise<string[]> {
  return (await validate(plainToInstance(DeliveryAddressDto, payload))).map((f) => f.property);
}

describe('DeliveryAddressDto', () => {
  it('aceita endereço completo com coordenadas', async () => {
    expect(
      await propriedadesInvalidas({
        street: 'Rua das Palmeiras',
        number: '458',
        city: 'Uberlândia',
        latitude: -18.9186,
        longitude: -48.2772,
      }),
    ).toEqual([]);
  });

  it('exige a rua: entregar sem logradouro não faz sentido', async () => {
    expect(await propriedadesInvalidas({ city: 'Uberlândia' })).toContain('street');
  });

  it('aceita endereço sem coordenadas — o frete cai na faixa padrão, mas não é erro', async () => {
    expect(await propriedadesInvalidas({ street: 'Rua das Palmeiras' })).toEqual([]);
  });

  it('recusa coordenada fora da faixa', async () => {
    expect(await propriedadesInvalidas({ street: 'Rua X', latitude: 999 })).toContain('latitude');
  });
});

describe('CreateFoodOrderDto — endereço de entrega', () => {
  it('é opcional: sem ele o pedido usa o endereço do cadastro', async () => {
    expect(await validate(plainToInstance(CreateFoodOrderDto, PEDIDO_MINIMO))).toEqual([]);
  });

  it('valida o endereço aninhado junto com o pedido', async () => {
    const dto = plainToInstance(CreateFoodOrderDto, {
      ...PEDIDO_MINIMO,
      deliveryAddress: { latitude: 999 },
    });

    // Sem `@ValidateNested`, o objeto passaria sem checagem nenhuma e o
    // endereço inválido só estouraria no banco.
    expect((await validate(dto)).map((f) => f.property)).toContain('deliveryAddress');
  });
});
