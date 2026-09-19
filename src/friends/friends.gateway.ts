import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsJwtGuard } from 'src/guards/ws-jwt.guard';
import { User } from 'src/users/entities/user.entity';
import { Conversation } from 'src/conversations/entities/conversation.entity';

type FriendSocketUser = Pick<User, '_id' | 'username' | 'name' | 'avatarUrl'>;

const toSocketUser = (user: FriendSocketUser) => ({
  _id: user._id.toString(),
  username: user.username,
  name: user.name,
  ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
});

@UseGuards(WsJwtGuard)
@WebSocketGateway()
export class FriendsGateway {
  @WebSocketServer()
  server!: Server;

  sendFriendRequest(
    senderId: string,
    receiverId: string,
    requestId: string,
    sender: FriendSocketUser,
    receiver: FriendSocketUser,
  ) {
    this.server.to(`user:${senderId}`).emit('friend.request.send', {
      userId: receiverId,
      relationship: 'SENT_PENDING',
      requestId,
      user: toSocketUser(receiver),
    });
    this.server.to(`user:${receiverId}`).emit('friend.request.send', {
      userId: senderId,
      relationship: 'RECEIVED_PENDING',
      requestId,
      user: toSocketUser(sender),
    });
  }
  acceptFriendRequest(
    sender: User,
    receiver: User,
    requestId: string,
    conversation: Conversation,
  ) {
    this.server.to(`user:${sender._id}`).emit('friend.request.accept', {
      userId: receiver._id.toString(),
      relationship: 'FRIEND',
      requestId,
      user: toSocketUser(receiver),
      conversation,
    });
    this.server.to(`user:${receiver._id}`).emit('friend.request.accept', {
      userId: sender._id.toString(),
      relationship: 'FRIEND',
      requestId,
      user: toSocketUser(sender),
      conversation,
    });
  }
  declineOrCancelRequest(
    senderId: string,
    receiverId: string,
    requestId: string,
  ) {
    this.server.to(`user:${senderId}`).emit('friend.request.cancel', {
      userId: receiverId,
      relationship: 'NONE',
      requestId,
    });
    this.server.to(`user:${receiverId}`).emit('friend.request.cancel', {
      userId: senderId,
      relationship: 'NONE',
      requestId,
    });
  }
  unfriend(senderId: string, receiverId: string, conversationId?: string) {
    this.server.to(`user:${senderId}`).emit('friend.request.unfriend', {
      userId: receiverId,
      relationship: 'NONE',
      conversationId,
    });
    this.server.to(`user:${receiverId}`).emit('friend.request.unfriend', {
      userId: senderId,
      relationship: 'NONE',
      conversationId,
    });
  }
}
