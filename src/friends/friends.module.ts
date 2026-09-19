// src/friends/friends.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FriendRequest, FriendRequestSchema } from './entities/friend.entity';
import { User, userSchema } from 'src/users/entities/user.entity';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { FriendsGateway } from './friends.gateway';
import {
  Conversation,
  conversationSchema,
} from 'src/conversations/entities/conversation.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FriendRequest.name, schema: FriendRequestSchema },
      { name: User.name, schema: userSchema },
      { name: Conversation.name, schema: conversationSchema },
    ]),
    ConversationsModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService, FriendsGateway],
  exports: [FriendsService],
})
export class FriendsModule {}
