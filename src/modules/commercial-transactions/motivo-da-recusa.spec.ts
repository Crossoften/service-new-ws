import { PrismaService } from '@database/PrismaService';
import { Prisma, User } from '@prisma/client';

import { MercadoPagoAccountsService } from '../mercado-pago/mercado-pago-accounts.service';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionGuardService } from '../subscription-guard/subscription-guard.service';
import { CommercialTransactionsService } from './commercial-transactions.service';
import { RespondCommercialTransactionDto } from './dto/respond-commercial-transaction.dto';
import { CommercialTransactionStatusEnum } from './enums/commercial-transaction-status.enum';

const VENDEDOR = { id: 2 } as User;

/**
 * O motivo da recusa passa a ficar no registro, além do chat.
 *
 * O texto é o mesmo: o `message` da resposta continua sendo postado como
 * mensagem na conversa. A coluna existe para a tela de detalhe exibir a
 * decisão sem depender de abrir o chat e achar a mensagem certa.
 *
 * Não é obrigatório, diferente da reserva e do aluguel: ali a regra do produto
 * exige justificativa; aqui o app já recusava sem mensagem, e exigir agora
 * quebraria o fluxo que está no ar.
 */
function build() {
  const atualizar = jest.fn().mockResolvedValue({ id: 8 });
  const criarMensagem = jest.fn();

  const tx = {
    commercialTransaction: { update: atualizar },
    chatRoom: { findUnique: jest.fn().mockResolvedValue({ id: 50 }), update: jest.fn() },
    chatMessage: { create: criarMensagem },
    chatParticipant: { update: jest.fn() },
  };

  const prisma = {
    commercialTransaction: {
      findUnique: jest.fn().mockResolvedValue({
        id: 8,
        sellerId: VENDEDOR.id,
        buyerId: 1,
        status: CommercialTransactionStatusEnum.Requested,
        requestedAmount: 500,
      }),
    },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;

  const service = new CommercialTransactionsService(
    prisma,
    {} as MercadoPagoService,
    {} as MercadoPagoAccountsService,
    { notifyUser: jest.fn() } as unknown as NotificationsService,
    {} as SubscriptionGuardService,
  );

  jest.spyOn(service, 'findById').mockResolvedValue({ id: 8 } as never);

  return { service, atualizar, criarMensagem };
}

function responder(payload: Partial<RespondCommercialTransactionDto>) {
  return payload as RespondCommercialTransactionDto;
}

describe('commercialTransactions.respond — motivo da recusa', () => {
  it('grava o motivo ao recusar com mensagem', async () => {
    const { service, atualizar } = build();

    await service.respond(
      VENDEDOR,
      8,
      responder({
        status: CommercialTransactionStatusEnum.Rejected,
        message: '  O item já foi vendido.  ',
      }),
    );

    const data = atualizar.mock.calls[0][0].data;
    expect(data.rejectReason).toBe('O item já foi vendido.');
    expect(data.rejectedAt).toBeInstanceOf(Date);
  });

  it('continua postando o mesmo texto no chat', async () => {
    // O chat é a conversa e segue sendo a fonte dela; a coluna é o registro da
    // decisão. Os dois precisam dizer a mesma coisa.
    const { service, atualizar, criarMensagem } = build();

    await service.respond(
      VENDEDOR,
      8,
      responder({
        status: CommercialTransactionStatusEnum.Rejected,
        message: 'O item já foi vendido.',
      }),
    );

    expect(criarMensagem.mock.calls[0][0].data.message).toBe('O item já foi vendido.');
    expect(atualizar.mock.calls[0][0].data.rejectReason).toBe(
      criarMensagem.mock.calls[0][0].data.message,
    );
  });

  it('aceita recusa sem mensagem, gravando motivo nulo', async () => {
    const { service, atualizar, criarMensagem } = build();

    await service.respond(
      VENDEDOR,
      8,
      responder({ status: CommercialTransactionStatusEnum.Rejected }),
    );

    expect(atualizar.mock.calls[0][0].data.rejectReason).toBeNull();
    expect(criarMensagem).not.toHaveBeenCalled();
  });

  it('não grava motivo quando a mensagem é só espaço', async () => {
    const { service, atualizar } = build();

    await service.respond(
      VENDEDOR,
      8,
      responder({ status: CommercialTransactionStatusEnum.Rejected, message: '   ' }),
    );

    expect(atualizar.mock.calls[0][0].data.rejectReason).toBeNull();
  });

  it('não grava motivo ao aceitar, mesmo com mensagem', async () => {
    const { service, atualizar, criarMensagem } = build();

    await service.respond(
      VENDEDOR,
      8,
      responder({
        status: CommercialTransactionStatusEnum.Accepted,
        message: 'Fechado, pode pagar.',
      }),
    );

    expect(atualizar.mock.calls[0][0].data.rejectReason).toBeNull();
    // A mensagem do aceite continua indo para o chat: ela não é motivo de recusa.
    expect(criarMensagem.mock.calls[0][0].data.message).toBe('Fechado, pode pagar.');
  });
});

/**
 * O motivo precisa **voltar** na leitura, não só ser gravado.
 *
 * É o padrão "grava mas não lê" que já apareceu quatro vezes neste projeto, a
 * última delas no BE-Y33, nestes mesmos campos de recusa: o PATCH aceita, o GET
 * não devolve, e a tela abre vazia sem erro nenhum para explicar.
 */
describe('commercialTransactions.findById — motivo na resposta', () => {
  const MOTIVO = 'O item já foi vendido.';

  function buildLeitura() {
    const findUnique = jest.fn().mockResolvedValue({
      id: 8,
      referenceType: 'Product',
      referenceId: 4,
      status: CommercialTransactionStatusEnum.Rejected,
      title: 'Bicicleta',
      description: null,
      requestedAmount: new Prisma.Decimal('500.00'),
      agreedAmount: null,
      buyerId: 1,
      sellerId: VENDEDOR.id,
      acceptedAt: null,
      rejectedAt: new Date('2026-10-27T12:00:00Z'),
      rejectReason: MOTIVO,
      cancelledAt: null,
      paidAt: null,
      completedAt: null,
      createdAt: new Date('2026-10-27T11:00:00Z'),
      updatedAt: new Date('2026-10-27T12:00:00Z'),
      buyer: { id: 1, name: 'Comprador', fileUrl: null },
      seller: { id: VENDEDOR.id, name: 'Vendedor', fileUrl: null },
      product: {
        id: 4,
        name: 'Bicicleta',
        model: null,
        price: new Prisma.Decimal('500.00'),
        imageUrl: null,
      },
    });

    const prisma = {
      commercialTransaction: { findUnique },
      // O `findById` exige a sala: sem ela, lança antes de montar a resposta.
      chatRoom: { findUnique: jest.fn().mockResolvedValue({ id: 50 }) },
      payment: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    const service = new CommercialTransactionsService(
      prisma,
      {} as MercadoPagoService,
      {} as MercadoPagoAccountsService,
      {} as NotificationsService,
      {} as SubscriptionGuardService,
    );

    return { service, findUnique };
  }

  it('devolve o motivo gravado ao comprador', async () => {
    const { service } = buildLeitura();

    const resposta = await service.findById({ id: 1 } as User, 8);

    expect(resposta.rejectReason).toBe(MOTIVO);
  });

  it('pede a coluna no select, senão o valor nunca chega ao mapeamento', async () => {
    const { service, findUnique } = buildLeitura();

    await service.findById({ id: 1 } as User, 8);

    expect(findUnique.mock.calls[0][0].select.rejectReason).toBe(true);
  });
});
