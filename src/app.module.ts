import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import 'dotenv/config';
import { ServersModule } from './servers/servers.module';
import { MembersModule } from './members/members.module';
import { ChannelsModule } from './channels/channels.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    UsersModule,
    ServersModule,
    MembersModule,
    ChannelsModule,
    RolesModule,
    AuthModule,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 5, // Max 5 requests per IP address total across endpoints
      },
    ]),
  ],
})
export class AppModule {}
