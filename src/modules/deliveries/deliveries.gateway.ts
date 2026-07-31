import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '@database/PrismaService';
import { DeliveriesService } from './deliveries.service';

type AuthenticatedSocket = Socket & {
  data: {
    user?: User;
  };
};

@Injectable()
@WebSocketGateway({
  namespace: '/deliveries',
  cors: { origin: '*' },
})
export class DeliveriesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly connectedUsers = new Map<number, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DeliveriesService))
    private readonly deliveriesService: DeliveriesService,
  ) {}

  /**
   * Autenticação roda como middleware de namespace, não em `handleConnection`:
   * o Socket.IO só emite o evento `connect` ao cliente depois que `next()` é
   * chamado, evitando a corrida em que o cliente já envia mensagens antes da
   * consulta assíncrona ao usuário terminar.
   */
  afterInit(server: Server): void {
    server.use(async (socket: AuthenticatedSocket, next) => {
      const token = this.extractToken(socket);

      if (!token) {
        next(new Error('Usuário não autenticado.'));
        return;
      }

      try {
        const payload = this.jwtService.verify<{ id: number }>(token, {
          secret: process.env.JWT_SECRET,
        });

        const user = await this.prisma.user.findUnique({ where: { id: payload.id } });

        if (!user) {
          next(new Error('Usuário não autenticado.'));
          return;
        }

        socket.data.user = user;
        next();
      } catch {
        next(new Error('Usuário não autenticado.'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    const user = client.data.user;

    if (!user) return;

    if (!this.connectedUsers.has(user.id)) {
      this.connectedUsers.set(user.id, new Set());
    }
    this.connectedUsers.get(user.id)!.add(client.id);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;

    if (!user) return;

    const sockets = this.connectedUsers.get(user.id);

    if (sockets) {
      sockets.delete(client.id);

      if (sockets.size === 0) {
        this.connectedUsers.delete(user.id);
      }
    }
  }

  @SubscribeMessage('delivery:track')
  async trackDelivery(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { deliveryId: number },
  ) {
    const user = this.getSocketUser(client);

    try {
      const delivery = await this.deliveriesService.findById(user, payload.deliveryId);
      await client.join(this.deliveryChannel(payload.deliveryId));

      return delivery;
    } catch (error) {
      throw this.normalizeWsError(error);
    }
  }

  @SubscribeMessage('delivery:untrack')
  async untrackDelivery(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { deliveryId: number },
  ) {
    await client.leave(this.deliveryChannel(payload.deliveryId));
    return { success: true };
  }

  emitLocation(deliveryId: number, location: { lat: string; lng: string; updatedAt: Date }): void {
    this.server.to(this.deliveryChannel(deliveryId)).emit('delivery:location', {
      deliveryId,
      ...location,
    });
  }

  emitStatusChange(deliveryId: number, status: string): void {
    this.server.to(this.deliveryChannel(deliveryId)).emit('delivery:status', {
      deliveryId,
      status,
    });
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

  private deliveryChannel(deliveryId: number): string {
    return `delivery:${deliveryId}`;
  }

  private normalizeWsError(error: unknown): WsException {
    if (error instanceof WsException) {
      return error;
    }

    if (error instanceof Error) {
      return new WsException(error.message);
    }

    return new WsException('Erro ao processar rastreamento da entrega.');
  }
}
