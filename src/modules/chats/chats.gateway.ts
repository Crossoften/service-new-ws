import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatContextType, User } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '@database/PrismaService';
import { ChatsService } from './chats.service';

type AuthenticatedSocket = Socket & {
  data: {
    user?: User;
  };
};

@Injectable()
@WebSocketGateway({
  namespace: '/chats',
  cors: { origin: '*' },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly chatsService: ChatsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ id: number }>(token, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}

  @SubscribeMessage('chat:join')
  async joinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { roomId?: number; contextType?: ChatContextType; referenceId?: number },
  ) {
    const user = this.getSocketUser(client);

    try {
      let roomId = payload.roomId;

      if (!roomId && payload.contextType && payload.referenceId) {
        const room = await this.chatsService.openByContext(
          user,
          payload.contextType,
          payload.referenceId,
        );
        roomId = room.id;
      }

      if (!roomId) {
        throw new WsException('Informe roomId ou contexto válido.');
      }

      const room = await this.chatsService.findById(user, roomId);
      await client.join(this.roomChannel(room.id));

      return room;
    } catch (error) {
      throw this.normalizeWsError(error);
    }
  }

  @SubscribeMessage('chat:send')
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      roomId: number;
      message?: string;
      fileName?: string;
      fileUrl?: string;
      fileKey?: string;
    },
  ) {
    const user = this.getSocketUser(client);

    try {
      const result = await this.chatsService.sendMessageAndGetLastMessage(user, payload.roomId, {
        message: payload.message,
        fileName: payload.fileName,
        fileUrl: payload.fileUrl,
        fileKey: payload.fileKey,
      });

      this.server.to(this.roomChannel(payload.roomId)).emit('chat:message', {
        roomId: payload.roomId,
        message: result.message,
      });

      this.server.to(this.roomChannel(payload.roomId)).emit('chat:updated', result.room);

      return result;
    } catch (error) {
      throw this.normalizeWsError(error);
    }
  }

  @SubscribeMessage('chat:read')
  async markAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: number },
  ) {
    const user = this.getSocketUser(client);

    try {
      const room = await this.chatsService.markAsRead(user, payload.roomId);

      this.server.to(this.roomChannel(payload.roomId)).emit('chat:read', {
        roomId: payload.roomId,
        userId: user.id,
      });

      return room;
    } catch (error) {
      throw this.normalizeWsError(error);
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authHeader = client.handshake.auth?.token || client.handshake.headers.authorization;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    if (typeof authHeader === 'string') {
      return authHeader;
    }

    return undefined;
  }

  private getSocketUser(client: AuthenticatedSocket): User {
    if (!client.data.user) {
      throw new WsException('Usuário não autenticado.');
    }

    return client.data.user;
  }

  private roomChannel(roomId: number): string {
    return `chat-room:${roomId}`;
  }

  private normalizeWsError(error: unknown): WsException {
    if (error instanceof WsException) {
      return error;
    }

    if (error instanceof Error) {
      return new WsException(error.message);
    }

    return new WsException('Erro ao processar mensagem do chat.');
  }
}
