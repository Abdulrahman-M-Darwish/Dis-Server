import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import 'dotenv/config';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { FriendsModule } from './friends/friends.module';
import { AppGateway } from './app.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PresenceModule } from './presence/presence.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    JwtModule.register({ secret: process.env.JWT_SECRET, global: true }),
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 5, // Max 5 requests per IP address total across endpoints
      },
    ]),
    ConversationsModule,
    MessagesModule,
    FriendsModule,
    PresenceModule,
  ],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class AppModule {}
