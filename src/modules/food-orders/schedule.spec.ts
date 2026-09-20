import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateFoodOrderDto } from './dto/create-food-order.dto';
import { FoodOrderInvalidScheduleException } from './exceptions/food-order-invalid-schedule.exception';
import { FoodOrdersService } from './food-orders.service';

const PEDIDO_MINIMO = {
  restaurantId: 1,
  paymentMethod: 'Cash',
  items: [{ menuItemId: 1, quantity: 1 }],
};

/**
 * `parseSchedule` é privado porque é detalhe de como a criação interpreta o
 * payload — o comportamento sob teste é a regra, não a API pública.
 */
function parseSchedule(valor?: string): Date | undefined {
  const service = Object.create(FoodOrdersService.prototype) as unknown as {
    parseSchedule: (v?: string) => Date | undefined;
  };

  return service.parseSchedule(valor);
}

describe('CreateFoodOrderDto — agendamento', () => {
  it('é opcional: sem ele o pedido é para agora', async () => {
    expect(await validate(plainToInstance(CreateFoodOrderDto, PEDIDO_MINIMO))).toEqual([]);
  });

  it('recusa texto que não é data', async () => {
    const dto = plainToInstance(CreateFoodOrderDto, {
      ...PEDIDO_MINIMO,
      scheduledFor: 'hoje à noite',
    });

    expect((await validate(dto)).map((f) => f.property)).toContain('scheduledFor');
  });

  it('aceita ISO 8601 válido', async () => {
    const dto = plainToInstance(CreateFoodOrderDto, {
      ...PEDIDO_MINIMO,
      scheduledFor: '2027-01-01T20:00:00.000Z',
    });

    expect(await validate(dto)).toEqual([]);
  });
});

describe('FoodOrdersService.parseSchedule', () => {
  it('devolve undefined quando nada foi agendado', () => {
    expect(parseSchedule()).toBeUndefined();
    expect(parseSchedule('')).toBeUndefined();
  });

  it('converte horário futuro', () => {
    const daquiUmaHora = new Date(Date.now() + 3600_000).toISOString();

    expect(parseSchedule(daquiUmaHora)?.toISOString()).toBe(daquiUmaHora);
  });

  it('recusa horário no passado', () => {
    const ontem = new Date(Date.now() - 86_400_000).toISOString();

    // O `@IsDateString` valida só o formato: uma data bem formada e passada
    // passaria pela validação e produziria pedido agendado para ontem.
    expect(() => parseSchedule(ontem)).toThrow(FoodOrderInvalidScheduleException);
  });

  it('recusa o instante presente: agendar para agora é pedido comum', () => {
    expect(() => parseSchedule(new Date().toISOString())).toThrow(
      FoodOrderInvalidScheduleException,
    );
  });
});
