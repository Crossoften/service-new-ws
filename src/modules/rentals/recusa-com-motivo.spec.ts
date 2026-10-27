import { PrismaService } from '@database/PrismaService';
import { RentalStatusEnum, User } from '@prisma/client';

import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { RespondRentalDto } from './dto/respond-rental.dto';
import { RentalsService } from './rentals.service';

const FORNECEDOR = { id: 9 } as User;

/**
 * Espelho do teste da reserva: mesma regra, outro módulo.
 *
 * O aluguel não usa transação no `respond` — não há disponibilidade a bloquear
 * —, então o duplo é mais simples; o que está sob teste é o mesmo.
 */
function build() {
  const atualizar = jest.fn().mockResolvedValue({ id: 5 });

  const prisma = {
    rental: {
      findUnique: jest.fn().mockResolvedValue({
        id: 5,
        status: RentalStatusEnum.Requested,
        requesterId: 1,
        providerId: FORNECEDOR.id,
      }),
      update: atualizar,
    },
  } as unknown as PrismaService;

  const service = new RentalsService(prisma, {} as SubscriptionGuardService);

  jest.spyOn(service, 'findById').mockResolvedValue({ id: 5 } as never);

  return { service, atualizar };
}

describe('rentals.respond — motivo da recusa', () => {
  it('grava o motivo ao recusar', async () => {
    const { service, atualizar } = build();

    await service.respond(FORNECEDOR, 5, {
      status: RentalStatusEnum.Rejected,
      rejectReason: 'O item já está reservado nesse período.',
    } as RespondRentalDto);

    const data = atualizar.mock.calls[0][0].data;
    expect(data.rejectReason).toBe('O item já está reservado nesse período.');
    expect(data.rejectedAt).toBeInstanceOf(Date);
  });

  it('ignora o motivo ao aceitar', async () => {
    const { service, atualizar } = build();

    await service.respond(FORNECEDOR, 5, {
      status: RentalStatusEnum.Accepted,
      rejectReason: 'não deveria ser gravado',
    } as RespondRentalDto);

    const data = atualizar.mock.calls[0][0].data;
    expect(data.rejectReason).toBeUndefined();
    expect(data.acceptedAt).toBeInstanceOf(Date);
  });
});
