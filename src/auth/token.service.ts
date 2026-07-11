import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class TokenService {
  constructor(private readonly redisService: RedisService) {}

  async saveRefreshToken(userId: string, token: string, ttl: number) {
    await this.redisService.set(`refresh_token:${userId}`, token, {
      expiration: { type: 'EX', value: ttl },
    });
  }

  async isTokenValid(userId: string, token: string): Promise<boolean> {
    const storedToken = await this.redisService.get(`refresh_token:${userId}`);
    return storedToken === token;
  }

  async revokeRefreshToken(userId: string) {
    await this.redisService.del(`refresh_token:${userId}`);
  }
}
