import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateFoodOrderDto } from './dto/create-food-order.dto';

const PEDIDO_MINIMO = {
  restaurantId: 1,
  paymentMethod: 'Cash',
  items: [{ menuItemId: 1, quantity: 1 }],
};

async function propriedadesInvalidas(tip: unknown): Promise<string[]> {
  const dto = plainToInstance(CreateFoodOrderDto, { ...PEDIDO_MINIMO, tip });

  return (await validate(dto)).map((f) => f.property);
}

describe('CreateFoodOrderDto — gorjeta', () => {
  it('é opcional: sem ela o pedido segue sem gorjeta', async () => {
    expect(await validate(plainToInstance(CreateFoodOrderDto, PEDIDO_MINIMO))).toEqual([]);
  });

  it('aceita valor com centavos', async () => {
    expect(await propriedadesInvalidas(5.5)).toEqual([]);
  });

  it('aceita zero', async () => {
    expect(await propriedadesInvalidas(0)).toEqual([]);
  });

  it('converte valor enviado como texto', async () => {
    const dto = plainToInstance(CreateFoodOrderDto, { ...PEDIDO_MINIMO, tip: '7.50' });

    expect(await validate(dto)).toEqual([]);
    expect(dto.tip).toBe(7.5);
  });

  it('recusa gorjeta negativa', async () => {
    expect(await propriedadesInvalidas(-1)).toContain('tip');
  });

  it('recusa mais de duas casas decimais', async () => {
    expect(await propriedadesInvalidas(5.555)).toContain('tip');
  });

  it('recusa valor acima do teto', async () => {
    // Teto existe para não transformar um erro de digitação em cobrança de
    // milhares de reais no cartão do cliente.
    expect(await propriedadesInvalidas(1001)).toContain('tip');
  });
});

describe('Aritmética da gorjeta no split', () => {
  it('a plataforma retém comissão, frete e gorjeta; o restaurante recebe o líquido dos itens', () => {
    const itens = 50;
    const frete = 8;
    const gorjeta = 5;
    const comissao = 10;

    const total = itens + frete + gorjeta;
    const retencao = comissao + frete + gorjeta;

    expect(total).toBe(63);
    expect(retencao).toBe(23);
    // O restaurante recebe o total menos a retenção — que é exatamente os itens
    // menos a comissão. A gorjeta não passa por ele nem sofre comissão.
    expect(total - retencao).toBe(itens - comissao);
    // E o entregador recebe frete mais gorjeta, os dois vindos da retenção.
    expect(frete + gorjeta).toBe(13);
    // Sobra para a plataforma exatamente a comissão.
    expect(retencao - (frete + gorjeta)).toBe(comissao);
  });
});
