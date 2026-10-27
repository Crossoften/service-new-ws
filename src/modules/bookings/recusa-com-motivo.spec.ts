import { PrismaService } from '@database/PrismaService';
import { BookingStatusEnum, Prisma, User } from '@prisma/client';

import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { BookingsService } from './bookings.service';
import { RespondBookingDto } from './dto/respond-booking.dto';

const FORNECEDOR = { id: 9 } as User;

/**
 * O motivo é gravado só na recusa.
 *
 * Confirmação com motivo no corpo passa pela validação — o `@ValidateIf` solta
 * o campo —, e aqui o serviço precisa ignorá-lo: motivo de recusa em reserva
 * confirmada seria dado contraditório no histórico.
 */
function build() {
  const atualizar = jest.fn().mockResolvedValue({ id: 5 });

  const tx = {
    booking: { update: atualizar },
    accommodationAvailability: { createMany: jest.fn() },
  };

  const prisma = {
    booking: {
      findUnique: jest.fn().mockResolvedValue({
        id: 5,
        status: BookingStatusEnum.Requested,
        requesterId: 1,
        providerId: FORNECEDOR.id,
        accommodationId: 3,
        checkIn: new Date('2026-11-01T00:00:00Z'),
        checkOut: new Date('2026-11-03T00:00:00Z'),
      }),
    },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;

  const service = new BookingsService(prisma, {} as SubscriptionGuardService);

  // `respond()` recarrega a reserva no fim para montar a resposta; não é o que
  // está sob teste, e modelar o select inteiro traria ruído sem ganho.
  jest.spyOn(service, 'findById').mockResolvedValue({ id: 5 } as never);

  return { service, atualizar };
}

describe('bookings.respond — motivo da recusa', () => {
  it('grava o motivo ao recusar', async () => {
    const { service, atualizar } = build();

    await service.respond(FORNECEDOR, 5, {
      status: BookingStatusEnum.Rejected,
      rejectReason: 'Sem disponibilidade nessas datas.',
    } as RespondBookingDto);

    const data = atualizar.mock.calls[0][0].data;
    expect(data.rejectReason).toBe('Sem disponibilidade nessas datas.');
    expect(data.rejectedAt).toBeInstanceOf(Date);
  });

  it('ignora o motivo ao confirmar', async () => {
    const { service, atualizar } = build();

    await service.respond(FORNECEDOR, 5, {
      status: BookingStatusEnum.Confirmed,
      rejectReason: 'não deveria ser gravado',
    } as RespondBookingDto);

    const data = atualizar.mock.calls[0][0].data;
    expect(data.rejectReason).toBeUndefined();
    expect(data.confirmedAt).toBeInstanceOf(Date);
  });

  it('não mexe no motivo de recusa anterior ao confirmar', async () => {
    // `undefined` no Prisma é "não escreve este campo": uma confirmação não
    // apaga o que já estava gravado, só deixa de tocar na coluna.
    const { service, atualizar } = build();

    await service.respond(FORNECEDOR, 5, {
      status: BookingStatusEnum.Confirmed,
    } as RespondBookingDto);

    expect('rejectReason' in atualizar.mock.calls[0][0].data).toBe(true);
    expect(atualizar.mock.calls[0][0].data.rejectReason).toBeUndefined();
  });
});

/**
 * O motivo precisa **voltar** na leitura, não só ser gravado.
 *
 * Mutante que apagou `rejectReason` do mapeamento da resposta compilou sem
 * erro, porque o campo é opcional no DTO — é o mesmo padrão "grava mas não lê"
 * que já apareceu três vezes neste projeto: o PATCH aceita, o GET não devolve,
 * e a tela abre vazia sem erro nenhum.
 */
describe('bookings.findById — motivo da recusa na resposta', () => {
  const MOTIVO = 'Sem disponibilidade nessas datas.';

  function buildLeitura() {
    const findUnique = jest.fn().mockResolvedValue({
      id: 5,
      status: BookingStatusEnum.Rejected,
      checkIn: new Date('2026-11-01T00:00:00Z'),
      checkOut: new Date('2026-11-03T00:00:00Z'),
      guests: 2,
      totalValue: new Prisma.Decimal('250.00'),
      cancelReason: null,
      rejectReason: MOTIVO,
      requesterId: 1,
      providerId: FORNECEDOR.id,
      confirmedAt: null,
      rejectedAt: new Date('2026-10-20T00:00:00Z'),
      checkedInAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-10-19T00:00:00Z'),
      updatedAt: new Date('2026-10-20T00:00:00Z'),
      accommodation: { id: 3, name: 'Chalé', imageUrl: null },
      requester: { id: 1, name: 'Cliente', fileUrl: null },
      provider: { id: FORNECEDOR.id, name: 'Fornecedor', fileUrl: null },
    });

    const prisma = {
      booking: { findUnique },
      chatRoom: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    return {
      service: new BookingsService(prisma, {} as SubscriptionGuardService),
      findUnique,
    };
  }

  it('devolve o motivo gravado', async () => {
    const { service } = buildLeitura();

    const resposta = await service.findById(FORNECEDOR, 5);

    expect(resposta.rejectReason).toBe(MOTIVO);
  });

  it('pede a coluna no select, senão o valor nunca chega ao mapeamento', async () => {
    const { service, findUnique } = buildLeitura();

    await service.findById(FORNECEDOR, 5);

    expect(findUnique.mock.calls[0][0].select.rejectReason).toBe(true);
  });
});
