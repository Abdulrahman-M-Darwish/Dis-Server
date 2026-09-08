import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppGateway } from 'src/app.gateway';
import { RedisService } from 'src/redis/redis.service';
import { UserStatus } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PresenceCronService {
  private readonly logger = new Logger(PresenceCronService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly appGateway: AppGateway,
  ) {}

  // Runs every 15 seconds
  @Cron(CronExpression.EVERY_MINUTE)
  async handleStalePresenceCleanup() {
    try {
      // Clean stale connections and get user IDs who timed out completely
      const offlineUserIds = await this.redisService.cleanupStaleConnections();

      if (offlineUserIds.length === 0) return;

      const lastSeen = new Date();

      for (const userId of offlineUserIds) {
        // 1. Update database status to OFFLINE
        await this.usersService.update(userId, {
          status: UserStatus.OFFLINE,
          lastSeen,
        });

        // 2. Broadcast status change to their friends via WebSocket
        await this.appGateway.broadcastStatusToFriends(
          userId,
          UserStatus.OFFLINE,
          lastSeen,
        );
      }

      this.logger.log(
        `Marked ${offlineUserIds.length} users offline due to heartbeat timeout.`,
      );
    } catch (error) {
      this.logger.error('Error executing presence cleanup cron job', error);
    }
  }
}
