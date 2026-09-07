import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { QueryRestaurantPayoutDto } from './dto/query-restaurant-payout.dto';

describe('CreateRestaurantDto — tempo de entrega', () => {
  it('aceita a faixa completa', async () => {
    const dto = plainToInstance(CreateRestaurantDto, {
      name: 'Cantina',
      categoryId: 1,
      deliveryTimeMinMinutes: 30,
      deliveryTimeMaxMinutes: 45,
    });

    expect(await validate(dto)).toEqual([]);
  });

  it('aceita restaurante sem tempo informado', async () => {
    const dto = plainToInstance(CreateRestaurantDto, { name: 'Cantina', categoryId: 1 });

    expect(await validate(dto)).toEqual([]);
  });

  it('recusa tempo zero ou negativo', async () => {
    const dto = plainToInstance(CreateRestaurantDto, {
      name: 'Cantina',
      categoryId: 1,
      deliveryTimeMinMinutes: 0,
    });

    expect((await validate(dto)).map((f) => f.property)).toContain('deliveryTimeMinMinutes');
  });

  it('recusa tempo acima do teto de oito horas', async () => {
    const dto = plainToInstance(CreateRestaurantDto, {
      name: 'Cantina',
      categoryId: 1,
      deliveryTimeMaxMinutes: 481,
    });

    expect((await validate(dto)).map((f) => f.property)).toContain('deliveryTimeMaxMinutes');
  });
});

describe('QueryRestaurantPayoutDto', () => {
  it('aceita os três recortes', async () => {
    for (const period of ['day', 'week', 'month']) {
      const dto = plainToInstance(QueryRestaurantPayoutDto, { period });

      expect(await validate(dto)).toEqual([]);
    }
  });

  it('aceita ausência: o relatório considera todo o histórico', async () => {
    expect(await validate(plainToInstance(QueryRestaurantPayoutDto, {}))).toEqual([]);
  });

  it('recusa recorte desconhecido', async () => {
    const dto = plainToInstance(QueryRestaurantPayoutDto, { period: 'ano' });

    expect((await validate(dto)).map((f) => f.property)).toContain('period');
  });
});
