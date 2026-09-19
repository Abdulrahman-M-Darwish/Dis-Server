/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { RedisService } from './redis/redis.service';
import { UsersService } from './users/users.service';
import { UserStatus } from './users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';

export type AuthenticatedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  {
    [x: string]: any;
    activeConversationId?: string;
    conversationTransitionId?: number;
    user: {
      userId: string;
    };
  }
>;

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  pingInterval: 25_000,
  pingTimeout: 20_000,
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly usersService: UsersService,
    private readonly presenceService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  // middleware to authenticate the socket connection using JWT
  afterInit(server: Server) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token || typeof token !== 'string') {
          return next(new Error('Missing authentication token'));
        }

        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });

        const authenticatedSocket = socket as AuthenticatedSocket;

        authenticatedSocket.data['user'] = {
          userId: payload.sub,
        };
        next();
      } catch {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    const userId = client.data.user.userId;
    if (!userId) {
      client.disconnect();
      return;
    }

    await client.join(`user:${userId}`);

    const becameOnline = await this.presenceService.addOrUpdateConnection(
      userId,
      client.id,
    );

    if (becameOnline) {
      await this.usersService.update(userId, {
        status: UserStatus.ONLINE,
        lastSeen: null,
      });

      await this.broadcastStatusToFriends(userId, UserStatus.ONLINE);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.user.userId;
    if (!userId) {
      return;
    }

    const becameOffline = await this.presenceService.removeConnection(
      userId,
      client.id,
    );

    if (becameOffline) {
      const lastSeen = new Date();

      await this.usersService.update(userId, {
        status: UserStatus.OFFLINE,
        lastSeen,
      });

      await this.broadcastStatusToFriends(userId, UserStatus.OFFLINE, lastSeen);
    }
  }

  async broadcastStatusToFriends(
    userId: string,
    status: UserStatus,
    lastSeen?: Date,
  ) {
    const user = await this.usersService.findByIdWithFriends(userId);
    if (!user) {
      return;
    }

    const payload = {
      userId,
      status,
      lastSeen: lastSeen ?? null,
    };

    for (const friend of user.friends) {
      this.server
        .to(`user:${friend._id.toString()}`)
        .emit('user.status.changed', payload);
    }
  }

  @SubscribeMessage('presence.ping')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.data?.user?.userId;
    if (userId) {
      await this.presenceService.addOrUpdateConnection(userId, client.id);
    }
  }
}
