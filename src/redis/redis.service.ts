import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly TTL_MS = 120000; // Sockets expire if no heartbeat for 120s

  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async set(
    key: string,
    value: string,
    options?: { expiration?: { type: 'EX' | 'PX'; value: number } },
  ): Promise<void> {
    await this.client.set(key, value, options);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  getClientInstance(): RedisClientType {
    return this.client;
  }

  // Presence management methods
  private key(userId: string) {
    return `presence:user:${userId}:connections`;
  }

  async addOrUpdateConnection(
    userId: string,
    socketId: string,
  ): Promise<boolean> {
    const key = this.key(userId);
    const now = Date.now();
    const cutoff = now - this.TTL_MS;

    // 1. Remove expired sockets for this user first
    await this.client.zRemRangeByScore(key, 0, cutoff);

    // 2. Get active count BEFORE adding this socket
    const countBefore = await this.client.zCard(key);

    // 3. Add or update the socket with current timestamp
    await this.client.zAdd(key, { score: now, value: socketId });

    // Set key TTL as a safety fallback
    await this.client.expire(key, 180);

    // Returns true ONLY if user was previously offline (0 active sockets)
    return countBefore === 0;
  }

  /**
   * Explicitly removes a socket on client disconnect.
   */
  async removeConnection(userId: string, socketId: string): Promise<boolean> {
    const key = this.key(userId);
    const now = Date.now();
    const cutoff = now - this.TTL_MS;

    // 1. Remove specific socket and any expired sockets
    await this.client.zRem(key, socketId);
    await this.client.zRemRangeByScore(key, 0, cutoff);

    // 2. Check remaining active connections
    const remaining = await this.client.zCard(key);

    if (remaining === 0) {
      await this.client.del(key);
      return true; // Transition to OFFLINE
    }

    return false;
  }

  /**
   * Checks if user has any active (non-expired) sockets.
   */
  async isOnline(userId: string): Promise<boolean> {
    const key = this.key(userId);
    const cutoff = Date.now() - this.TTL_MS;

    await this.client.zRemRangeByScore(key, 0, cutoff);
    return (await this.client.zCard(key)) > 0;
  }

  /**
   * Scans all presence keys and purges expired sockets.
   * Returns an array of userIds who transitioned from ONLINE -> OFFLINE.
   */
  async cleanupStaleConnections(): Promise<string[]> {
    const cutoff = Date.now() - this.TTL_MS;
    const nowOfflineUserIds: string[] = [];

    // Use SCAN to safely iterate through presence keys without blocking Redis
    let cursor = '0';
    do {
      const reply = await this.client.scan(cursor, {
        MATCH: 'presence:user:*:connections',
        COUNT: 100,
      });

      cursor = reply.cursor;

      const keys = reply.keys;

      for (const key of keys) {
        // Extract userId from key format: "presence:user:<userId>:connections"
        const userId = key.split(':')[2];

        // 1. Remove entries older than cutoff
        await this.client.zRemRangeByScore(key, 0, cutoff);

        // 2. Check remaining active sockets
        const remaining = await this.client.zCard(key);

        if (remaining === 0) {
          // Key is empty (all sockets timed out), clean up key and mark user offline
          await this.client.del(key);
          nowOfflineUserIds.push(userId);
        }
      }
    } while (cursor !== '0');

    return nowOfflineUserIds;
  }
}
