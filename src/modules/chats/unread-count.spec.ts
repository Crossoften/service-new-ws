import { PrismaService } from '@database/PrismaService';
import { User } from '@prisma/client';

import { ChatsService } from './chats.service';

const USUARIO = { id: 7 } as User;

function build(participacoes: { roomId: number; lastReadAt: Date | null }[], total = 0) {
  const contar = jest.fn().mockResolvedValue(total);

  const prisma = {
    chatParticipant: { findMany: jest.fn().mockResolvedValue(participacoes) },
    chatMessage: { count: contar },
  } as unknown as PrismaService;

  return { service: new ChatsService(prisma), contar };
}

const ONTEM = new Date('2026-09-22T10:00:00Z');

describe('chats.countUnreadTotal', () => {
  it('soma as não lidas de todas as conversas', async () => {
    const { service } = build([{ roomId: 1, lastReadAt: ONTEM }], 5);

    expect(await service.countUnreadTotal(USUARIO)).toEqual({ total: 5 });
  });

  it('não consulta mensagem quando o usuário não tem conversa', async () => {
    const { service, contar } = build([]);

    expect(await service.countUnreadTotal(USUARIO)).toEqual({ total: 0 });
    expect(contar).not.toHaveBeenCalled();
  });

  it('nunca conta as mensagens do próprio usuário', async () => {
    const { service, contar } = build([{ roomId: 1, lastReadAt: ONTEM }]);

    await service.countUnreadTotal(USUARIO);

    for (const condicao of contar.mock.calls[0][0].where.OR) {
      expect(condicao.senderId).toEqual({ not: USUARIO.id });
    }
  });

  it('conta a partir da última leitura de cada sala', async () => {
    const { service, contar } = build([{ roomId: 1, lastReadAt: ONTEM }]);

    await service.countUnreadTotal(USUARIO);

    expect(contar.mock.calls[0][0].where.OR[0].createdAt).toEqual({ gt: ONTEM });
  });

  it('conta tudo na sala que nunca foi aberta', async () => {
    // Sem `lastReadAt` não há corte por data: toda mensagem da contraparte
    // está por ler.
    const { service, contar } = build([{ roomId: 2, lastReadAt: null }]);

    await service.countUnreadTotal(USUARIO);

    expect(contar.mock.calls[0][0].where.OR[0].createdAt).toBeUndefined();
  });

  it('monta uma condição por sala', async () => {
    const { service, contar } = build([
      { roomId: 1, lastReadAt: ONTEM },
      { roomId: 2, lastReadAt: null },
      { roomId: 3, lastReadAt: ONTEM },
    ]);

    await service.countUnreadTotal(USUARIO);

    expect(contar.mock.calls[0][0].where.OR).toHaveLength(3);
  });
});
