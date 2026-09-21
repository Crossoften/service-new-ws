import { PrismaService } from '@database/PrismaService';
import { User } from '@prisma/client';

import { RestaurantsService } from './restaurants.service';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CARD_MACHINE_TERMS_VERSION } from './card-machine';
import { RestaurantCardMachineTermsRequiredException } from './exceptions/restaurant-card-machine-terms-required.exception';

const DONO = { id: 5 } as User;

interface Cenario {
  service: RestaurantsService;
  update: jest.Mock;
}

function build(usesOwnCardMachine: boolean): Cenario {
  const update = jest.fn().mockResolvedValue({});

  const prisma = {
    restaurant: {
      findUnique: jest.fn().mockResolvedValue({ id: 3, usesOwnCardMachine }),
      update,
    },
  } as unknown as PrismaService;

  const service = new RestaurantsService(prisma, {} as SubscriptionGuardService);

  jest.spyOn(service, 'findMine').mockResolvedValue({ id: 3 } as never);

  return { service, update };
}

describe('restaurants.updateMyCardMachine — aceite de responsabilidade', () => {
  it('recusa ligar sem aceite', async () => {
    const { service, update } = build(false);

    await expect(
      service.updateMyCardMachine(DONO, { usesOwnCardMachine: true }),
    ).rejects.toBeInstanceOf(RestaurantCardMachineTermsRequiredException);

    expect(update).not.toHaveBeenCalled();
  });

  it('grava quem aceitou, quando e sobre qual termo', async () => {
    const { service, update } = build(false);

    await service.updateMyCardMachine(DONO, {
      usesOwnCardMachine: true,
      acceptResponsibility: true,
    });

    const { data } = update.mock.calls[0][0];
    expect(data.usesOwnCardMachine).toBe(true);
    expect(data.cardMachineAcceptedById).toBe(DONO.id);
    expect(data.cardMachineTermsVersion).toBe(CARD_MACHINE_TERMS_VERSION);
    expect(data.cardMachineAcceptedAt).toBeInstanceOf(Date);
  });

  it('desligar limpa o aceite: religar exige aceitar de novo', async () => {
    const { service, update } = build(true);

    await service.updateMyCardMachine(DONO, { usesOwnCardMachine: false });

    const { data } = update.mock.calls[0][0];
    expect(data.usesOwnCardMachine).toBe(false);
    expect(data.cardMachineAcceptedAt).toBeNull();
    expect(data.cardMachineAcceptedById).toBeNull();
    expect(data.cardMachineTermsVersion).toBeNull();
  });

  it('desligar não exige aceite', async () => {
    const { service, update } = build(true);

    await expect(
      service.updateMyCardMachine(DONO, { usesOwnCardMachine: false }),
    ).resolves.toBeDefined();

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('não regrava o aceite quando já está ligado', async () => {
    // Senão a data do aceite viraria a do último toque na tela, e não a do
    // momento em que a responsabilidade foi de fato assumida.
    const { service, update } = build(true);

    await service.updateMyCardMachine(DONO, {
      usesOwnCardMachine: true,
      acceptResponsibility: true,
    });

    expect(update).not.toHaveBeenCalled();
  });
});
