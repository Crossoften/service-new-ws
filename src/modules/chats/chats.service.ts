import { PrismaService } from '@database/PrismaService';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatContextType, Prisma, User } from '@prisma/client';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { QueryChatMessagesDto } from './dto/query-chat-messages.dto';
import { ResponseFindChatMessagesDto } from './dto/response-chat-messages.dto';
import { ResponseChatDto, ResponseChatMessageDto } from './dto/response-chat.dto';
import { QueryChatsDto } from './dto/query-chats.dto';
import { ResponseFindChatsDto } from './dto/response-find-chats.dto';

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly roomSelect = Prisma.validator<Prisma.ChatRoomSelect>()({
    id: true,
    contextType: true,
    referenceId: true,
    lastMessageAt: true,
    createdAt: true,
    updatedAt: true,
    participants: {
      select: {
        lastReadAt: true,
        user: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    },
    messages: {
      select: {
        id: true,
        message: true,
        fileName: true,
        fileUrl: true,
        fileKey: true,
        createdAt: true,
        updatedAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    },
  });

  private readonly roomDetailsSelect = Prisma.validator<Prisma.ChatRoomSelect>()({
    id: true,
    contextType: true,
    referenceId: true,
    lastMessageAt: true,
    createdAt: true,
    updatedAt: true,
    participants: {
      select: {
        lastReadAt: true,
        user: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    },
  });

  /**
   * Inbox: todas as conversas em que o usuário participa.
   *
   * O contrato só permitia abrir chat por contexto ou por id, então a tela de
   * "Conversas" não tinha como listar. O modelo já previa isto — `lastMessageAt`
   * é indexado na sala e `lastReadAt` fica por participante — faltava expor.
   */
  async findMyChats(user: User, query: QueryChatsDto): Promise<ResponseFindChatsDto> {
    const take = Number(query.take) > 0 ? Number(query.take) : 20;
    const page = Number(query.skip) > 0 ? Number(query.skip) : 1;

    const where: Prisma.ChatRoomWhereInput = {
      participants: { some: { userId: user.id } },
      ...(query.search
        ? {
            participants: {
              some: {
                userId: { not: user.id },
                user: { name: { contains: query.search } },
              },
            },
          }
        : {}),
    };

    // Com busca textual, o filtro acima sobrescreve a cláusula de participação —
    // reaplicada aqui para não vazar conversa de terceiros.
    const scopedWhere: Prisma.ChatRoomWhereInput = query.search
      ? { AND: [{ participants: { some: { userId: user.id } } }, where] }
      : where;

    const [totalRecords, rooms] = await Promise.all([
      this.prisma.chatRoom.count({ where: scopedWhere }),
      this.prisma.chatRoom.findMany({
        where: scopedWhere,
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        take,
        skip: (page - 1) * take,
        select: {
          id: true,
          contextType: true,
          referenceId: true,
          lastMessageAt: true,
          createdAt: true,
          updatedAt: true,
          participants: {
            select: {
              userId: true,
              lastReadAt: true,
              user: { select: { id: true, name: true, fileUrl: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              fileName: true,
              senderId: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const unreadByRoom = await this.countUnread(user.id, rooms);

    return {
      chats: rooms.map((room) => {
        const other = room.participants.find((p) => p.userId !== user.id);
        const last = room.messages[0];

        return {
          id: room.id,
          contextType: room.contextType,
          referenceId: room.referenceId,
          lastMessageAt: room.lastMessageAt || undefined,
          otherUser: other
            ? {
                id: other.user.id,
                name: other.user.name,
                fileUrl: other.user.fileUrl || undefined,
              }
            : undefined,
          lastMessage: last
            ? {
                id: last.id,
                message: last.message || undefined,
                fileName: last.fileName || undefined,
                senderId: last.senderId,
                createdAt: last.createdAt,
              }
            : undefined,
          unreadCount: unreadByRoom.get(room.id) ?? 0,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
      }),
      currentPage: page,
      totalPages: Math.ceil(totalRecords / take) || 1,
      totalRecords,
    };
  }

  /**
   * Não lidas por sala, em uma única consulta.
   *
   * Cada sala tem seu próprio `lastReadAt`, então o corte temporal muda de sala
   * para sala — daí o OR montado por sala em vez de um filtro único.
   */
  private async countUnread(
    userId: number,
    rooms: { id: number; participants: { userId: number; lastReadAt: Date | null }[] }[],
  ): Promise<Map<number, number>> {
    if (rooms.length === 0) return new Map();

    const conditions: Prisma.ChatMessageWhereInput[] = rooms.map((room) => {
      const lastReadAt = room.participants.find((p) => p.userId === userId)?.lastReadAt;

      return {
        roomId: room.id,
        senderId: { not: userId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      };
    });

    const grouped = await this.prisma.chatMessage.groupBy({
      by: ['roomId'],
      where: { OR: conditions },
      _count: { _all: true },
    });

    return new Map(grouped.map((row) => [row.roomId, row._count._all]));
  }

  async openByContext(
    user: User,
    contextType: ChatContextType,
    referenceId: number,
  ): Promise<ResponseChatDto> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { contextType_referenceId: { contextType, referenceId } },
      select: this.roomSelect,
    });

    if (!room) {
      throw new NotFoundException('Chat não encontrado para o contexto informado.');
    }

    if (!room.participants.some((p) => p.user.id === user.id)) {
      throw new ForbiddenException('Acesso não autorizado ao chat.');
    }

    await this.prisma.chatParticipant.updateMany({
      where: { roomId: room.id, userId: user.id },
      data: { lastReadAt: new Date() },
    });

    return this.findById(user, room.id);
  }

  async findById(user: User, id: number): Promise<ResponseChatDto> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
      select: this.roomSelect,
    });

    if (!room) {
      throw new NotFoundException('Chat não encontrado.');
    }

    if (!room.participants.some((p) => p.user.id === user.id)) {
      throw new ForbiddenException('Acesso não autorizado ao chat.');
    }

    return {
      id: room.id,
      contextType: room.contextType,
      referenceId: room.referenceId,
      lastMessageAt: room.lastMessageAt || undefined,
      participants: room.participants.map((participant) => ({
        id: participant.user.id,
        name: participant.user.name,
        fileUrl: participant.user.fileUrl || undefined,
        lastReadAt: participant.lastReadAt || undefined,
      })),
      messages: room.messages.map((message) => ({
        id: message.id,
        message: message.message || undefined,
        fileName: message.fileName || undefined,
        fileUrl: message.fileUrl || undefined,
        fileKey: message.fileKey || undefined,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          fileUrl: message.sender.fileUrl || undefined,
        },
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      })),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  async findMessages(
    user: User,
    roomId: number,
    query: QueryChatMessagesDto,
  ): Promise<ResponseFindChatMessagesDto> {
    const take = query.take ?? 20;
    const page = query.skip ?? 1;
    const search = query.search?.trim() || undefined;

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: this.roomDetailsSelect,
    });

    if (!room) {
      throw new NotFoundException('Chat não encontrado.');
    }

    if (!room.participants.some((p) => p.user.id === user.id)) {
      throw new ForbiddenException('Acesso não autorizado ao chat.');
    }

    const [messages, totalRecords] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: {
          roomId: room.id,
          OR: search
            ? [{ message: { contains: search } }, { sender: { name: { contains: search } } }]
            : undefined,
        },
        select: {
          id: true,
          message: true,
          fileName: true,
          fileUrl: true,
          fileKey: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              fileUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.chatMessage.count({
        where: {
          roomId: room.id,
          OR: search
            ? [{ message: { contains: search } }, { sender: { name: { contains: search } } }]
            : undefined,
        },
      }),
    ]);

    const otherUser = room.participants.find(
      (participant) => participant.user.id !== user.id,
    )?.user;

    return {
      chat: {
        id: room.id,
        contextType: room.contextType,
        referenceId: room.referenceId,
        lastMessageAt: room.lastMessageAt || undefined,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              name: otherUser.name,
              fileUrl: otherUser.fileUrl || undefined,
            }
          : undefined,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
      messages: messages.map((message) => ({
        id: message.id,
        message: message.message || undefined,
        fileName: message.fileName || undefined,
        fileUrl: message.fileUrl || undefined,
        fileKey: message.fileKey || undefined,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          fileUrl: message.sender.fileUrl || undefined,
        },
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      })),
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / take)),
      totalRecords,
    };
  }

  async sendMessage(
    user: User,
    roomId: number,
    payload: CreateChatMessageDto,
  ): Promise<ResponseChatDto> {
    const result = await this.sendMessageAndGetLastMessage(user, roomId, payload);
    return result.room;
  }

  async markAsRead(user: User, roomId: number): Promise<ResponseChatDto> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: this.roomSelect,
    });

    if (!room) {
      throw new NotFoundException('Chat não encontrado.');
    }

    if (!room.participants.some((p) => p.user.id === user.id)) {
      throw new ForbiddenException('Acesso não autorizado ao chat.');
    }

    await this.prisma.chatParticipant.updateMany({
      where: { roomId: room.id, userId: user.id },
      data: { lastReadAt: new Date() },
    });

    return this.findById(user, room.id);
  }

  async sendMessageAndGetLastMessage(
    user: User,
    roomId: number,
    payload: CreateChatMessageDto,
  ): Promise<{ room: ResponseChatDto; message: ResponseChatMessageDto | undefined }> {
    const roomBeforeSend = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: this.roomSelect,
    });

    if (!roomBeforeSend) {
      throw new NotFoundException('Chat não encontrado.');
    }

    if (!roomBeforeSend.participants.some((p) => p.user.id === user.id)) {
      throw new ForbiddenException('Acesso não autorizado ao chat.');
    }

    const message = payload.message?.trim();

    if (!message && !payload.fileName && !payload.fileUrl && !payload.fileKey) {
      throw new BadRequestException('Informe uma mensagem ou anexe um arquivo.');
    }

    const createdMessage = await this.prisma.$transaction(async (tx) => {
      const newMessage = await tx.chatMessage.create({
        data: {
          roomId: roomBeforeSend.id,
          senderId: user.id,
          message: message || null,
          fileName: payload.fileName?.trim() || null,
          fileUrl: payload.fileUrl?.trim() || null,
          fileKey: payload.fileKey?.trim() || null,
        },
        select: {
          id: true,
          message: true,
          fileName: true,
          fileUrl: true,
          fileKey: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              fileUrl: true,
            },
          },
        },
      });

      await tx.chatRoom.update({
        where: { id: roomBeforeSend.id },
        data: { lastMessageAt: new Date() },
      });

      await tx.chatParticipant.update({
        where: {
          roomId_userId: {
            roomId: roomBeforeSend.id,
            userId: user.id,
          },
        },
        data: { lastReadAt: new Date() },
      });

      return newMessage;
    });

    const room = await this.findById(user, roomBeforeSend.id);

    return {
      room,
      message: {
        id: createdMessage.id,
        message: createdMessage.message || undefined,
        fileName: createdMessage.fileName || undefined,
        fileUrl: createdMessage.fileUrl || undefined,
        fileKey: createdMessage.fileKey || undefined,
        sender: {
          id: createdMessage.sender.id,
          name: createdMessage.sender.name,
          fileUrl: createdMessage.sender.fileUrl || undefined,
        },
        createdAt: createdMessage.createdAt,
        updatedAt: createdMessage.updatedAt,
      },
    };
  }
}
