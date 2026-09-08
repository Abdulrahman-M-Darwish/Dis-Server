// src/friends/friends.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FriendRequest, FriendRequestSchema } from './entities/friend.entity';
import { User, userSchema } from 'src/users/entities/user.entity';
import { ConversationsModule } from 'src/conversations/conversations.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FriendRequest.name, schema: FriendRequestSchema },
      { name: User.name, schema: userSchema },
    ]),
    ConversationsModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
