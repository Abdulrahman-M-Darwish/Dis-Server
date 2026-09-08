import { Module } from '@nestjs/common';
import { PresenceCronService } from './presence-cron.service';
import { RedisModule } from 'src/redis/redis.module';
import { UsersModule } from 'src/users/users.module';
import { AppGateway } from 'src/app.gateway';

@Module({
  imports: [RedisModule, UsersModule],
  providers: [PresenceCronService, AppGateway],
})
export class PresenceModule {}
