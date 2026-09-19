import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ConversationsService } from './conversations.service';
import { WsJwtGuard } from 'src/guards/ws-jwt.guard';
import { UseGuards } from '@nestjs/common';
import type { AuthenticatedSocket } from 'src/app.gateway';
import { Message } from 'src/messages/entities/message.entity';
import { RedisService } from 'src/redis/redis.service';
import { Conversation } from './entities/conversation.entity';

@UseGuards(WsJwtGuard)
@WebSocketGateway()
export class ConversationsGateway implements OnGatewayDisconnect {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly redisService: RedisService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private getParticipantId(participant: unknown) {
    if (
      participant &&
      typeof participant === 'object' &&
      '_id' in participant
    ) {
      return String((participant as { _id: unknown })._id);
    }
    return String(participant);
  }

  broadcastUpdated(
    conversation: Conversation,
    previousParticipantIds: string[] = [],
  ) {
    const participantIds = new Set([
      ...previousParticipantIds,
      ...((conversation.participants as unknown[]) ?? []).map((participant) =>
        this.getParticipantId(participant),
      ),
    ]);
    for (const participantId of participantIds) {
      this.server
        .to(`user:${participantId}`)
        .emit('conversation.updated', conversation);
    }
  }

  broadcastDeleted(conversationId: string, participantIds: string[]) {
    for (const participantId of participantIds) {
      this.server.to(`user:${participantId}`).emit('conversation.deleted', {
        conversationId,
      });
    }
  }

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const userId = socket.data.user.userId;
    const socketState = socket.data as { conversationTransitionId?: number };
    const transitionId = (socketState.conversationTransitionId ?? 0) + 1;
    socket.data.conversationTransitionId = transitionId;
    const previousConversationId = socket.data.activeConversationId;

    if (previousConversationId && previousConversationId !== conversationId) {
      await this.redisService.sRem(
        `chat:active:${previousConversationId}`,
        userId,
      );
      socket.to(previousConversationId).emit('conversation.stopTyping', {
        conversationId: previousConversationId,
        userId,
      });
      await socket.leave(previousConversationId);
    }

    socket.data.activeConversationId = conversationId;
    await socket.join(conversationId);
    await this.redisService.sAdd(`chat:active:${conversationId}`, userId);
    const conversation =
      await this.conversationsService.findOne(conversationId);
    if (conversation?.lastMessage) {
      await this.conversationsService.markAsRead(
        conversationId,
        userId,
        (conversation?.lastMessage as Message)._id,
      );
    }
    this.server
      .to(`user:${userId}`)
      .emit('conversation.join', { conversationId });
  }

  @SubscribeMessage('conversation.leave')
  async leaveConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const userId = socket.data.user.userId;
    if (socket.data.activeConversationId !== conversationId) return;

    const socketState = socket.data as { conversationTransitionId?: number };
    const transitionId = socketState.conversationTransitionId;
    socket.data.activeConversationId = undefined;
    await this.redisService.sRem(`chat:active:${conversationId}`, userId);
    socket.to(conversationId).emit('conversation.stopTyping', {
      conversationId,
      userId,
    });
    if (socket.data.conversationTransitionId === transitionId) {
      await socket.leave(conversationId);
    }
  }

  @SubscribeMessage('conversation.typing')
  handleTyping(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    if (socket.data.activeConversationId !== conversationId) return;
    socket.to(conversationId).emit('conversation.typing', {
      conversationId,
      userId: socket.data.user.userId,
    });
  }

  @SubscribeMessage('conversation.stopTyping')
  handleStopTyping(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    if (socket.data.activeConversationId !== conversationId) return;
    socket.to(conversationId).emit('conversation.stopTyping', {
      conversationId,
      userId: socket.data.user.userId,
    });
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const activeConversationId = client.data.activeConversationId;
    const userId = client.data.user.userId;
    if (userId && activeConversationId) {
      client.to(activeConversationId).emit('conversation.stopTyping', {
        conversationId: activeConversationId,
        userId,
      });
      await this.redisService.sRem(
        `chat:active:${activeConversationId}`,
        userId,
      );
    }
  }
}
