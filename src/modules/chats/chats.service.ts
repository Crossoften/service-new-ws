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

  async openByContext(
    user: User,
    contextType: ChatContextType,
    referenceId: number,
  ): Promise<ResponseChatDto> {
    const roomByContext = await this.prisma.chatRoom.findUnique({
      where: {
        contextType_referenceId: {
          contextType,
          referenceId,
        },
      },
      select: this.roomSelect,
    });

    if (!roomByContext) {
      throw new NotFoundException('Chat não encontrado para o contexto informado.');
    }

    if (!roomByContext.participants.some((p) => p.user.id === user.id)) {
      throw new ForbiddenException('Acesso não autorizado ao chat.');
    }

    await this.prisma.chatParticipant.update({
      where: {
        roomId_userId: {
          roomId: roomByContext.id,
          userId: user.id,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomByContext.id },
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

    await this.prisma.chatParticipant.update({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: user.id,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
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
