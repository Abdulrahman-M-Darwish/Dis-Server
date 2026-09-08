import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConversationsService } from './conversations.service';
import { WsJwtGuard } from 'src/guards/ws-jwt.guard';
import { UseGuards } from '@nestjs/common';

@UseGuards(WsJwtGuard)
@WebSocketGateway()
export class ConversationsGateway {
  constructor(private readonly conversationsService: ConversationsService) {}

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    await socket.join(conversationId);

    return {
      event: 'conversation.joined',
      conversationId,
    };
  }

  @SubscribeMessage('conversation.leave')
  async leaveConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    await socket.leave(conversationId);
  }
}
