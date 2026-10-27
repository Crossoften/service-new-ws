import { PrismaService } from '@database/PrismaService';
import { Prisma } from '@prisma/client';

import { DEFAULT_COMMISSION_RATE } from '../food-orders/commission';
import { PlatformSettingsService } from './platform-settings.service';

function build(linha: { deliveryCommissionRate: string } | null) {
  const findUnique = jest
    .fn()
    .mockResolvedValue(
      linha ? { deliveryCommissionRate: new Prisma.Decimal(linha.deliveryCommissionRate) } : null,
    );

  const prisma = { platformSettings: { findUnique } } as unknown as PrismaService;

  return { service: new PlatformSettingsService(prisma), findUnique };
}

describe('PlatformSettingsService.deliveryCommissionRate', () => {
  it('devolve a taxa configurada pelo administrador', async () => {
    const { service } = build({ deliveryCommissionRate: '17.50' });

    expect(await service.deliveryCommissionRate()).toBe(17.5);
  });

  it('devolve zero quando o admin configurou zero', async () => {
    // Zero é uma decisão válida — "ninguém paga comissão" — e não pode cair no
    // último recurso. `Prisma.Decimal(0)` é objeto, logo truthy, mas quem
    // depende disso é frágil: aqui a conversão é explícita.
    const { service } = build({ deliveryCommissionRate: '0' });

    expect(await service.deliveryCommissionRate()).toBe(0);
  });

  it('lê sempre a linha única de configuração', async () => {
    const { service, findUnique } = build({ deliveryCommissionRate: '17.50' });

    await service.deliveryCommissionRate();

    expect(findUnique.mock.calls[0][0].where).toEqual({ id: 1 });
  });

  it('cai no último recurso quando não existe linha de configuração', async () => {
    // Base recém-criada, ou antes de o admin abrir a tela pela primeira vez.
    // Derrubar o pedido nesse caso seria perder venda por falta de uma linha.
    const { service } = build(null);

    expect(await service.deliveryCommissionRate()).toBe(DEFAULT_COMMISSION_RATE);
  });
});
