import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Message } from './entities/message.entity';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from 'src/guards/ws-jwt.guard';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@WebSocketGateway()
@UseGuards(WsJwtGuard)
export class MessagesGateway {
  @WebSocketServer()
  server!: Server;
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationsModel: Model<Conversation>,
  ) {}
  private async getParticipants(conversationId: string) {
    const conversation = await this.conversationsModel
      .findById(conversationId)
      .select('participants');
    return conversation?.participants || [];
  }
  async broadcastNewMessage(message: Message) {
    for (const participant of await this.getParticipants(
      message.conversationId as string,
    )) {
      this.server
        .to(`user:${participant as string}`)
        .emit('message.new', message);
    }
  }
  async update(message: Message) {
    for (const participant of await this.getParticipants(
      message.conversationId as string,
    )) {
      this.server.to(`user:${participant as string}`).emit('message.updated', {
        _id: message._id,
        conversationId: message.conversationId,
        isEdited: true,
        text: message.text,
      });
    }
  }
  async remove(message: Message) {
    for (const participant of await this.getParticipants(
      message.conversationId as string,
    )) {
      this.server.to(`user:${participant as string}`).emit('message.removed', {
        _id: message._id,
        conversationId: message.conversationId,
      });
    }
  }
}
