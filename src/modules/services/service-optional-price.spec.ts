import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceTypeEnum } from './enums/service-type.enum';

const BASE = {
  name: 'Instalação elétrica',
  type: ServiceTypeEnum.Presential,
  categoryId: 1,
};

async function erros(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateServiceDto, { ...BASE, ...payload });
  const falhas = await validate(dto);

  return falhas.map((f) => f.property);
}

describe('CreateServiceDto — preço opcional', () => {
  it('aceita serviço sem preço: tudo sob orçamento', async () => {
    expect(await erros({})).not.toContain('price');
  });

  it('aceita preço de vitrine', async () => {
    expect(await erros({ price: 150 })).not.toContain('price');
  });

  it('converte preço enviado como texto', async () => {
    const dto = plainToInstance(CreateServiceDto, { ...BASE, price: '150.50' });

    expect(dto.price).toBe(150.5);
  });

  it('recusa preço negativo', async () => {
    expect(await erros({ price: -1 })).toContain('price');
  });

  it('recusa mais de duas casas decimais', async () => {
    expect(await erros({ price: 10.999 })).toContain('price');
  });
});
