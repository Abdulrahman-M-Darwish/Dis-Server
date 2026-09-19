import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  async connectToRedis() {
    const pubClient = createClient(
      process.env.REDIS_URL
        ? {
            url: process.env.REDIS_URL,
            socket: { tls: true, host: process.env.REDIS_HOST },
          }
        : {
            socket: {
              host: process.env.REDIS_HOST,
              port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
            },
          },
    );
    const subClient = pubClient.duplicate();
    pubClient.on('error', (error) => {
      console.error('Redis pub client error:', error);
    });
    subClient.on('error', (error) => {
      console.error('Redis sub client error:', error);
    });
    await pubClient.connect();
    await subClient.connect();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const server = super.createIOServer(port, options);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    server.adapter(this.adapterConstructor);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();

  app.useWebSocketAdapter(redisIoAdapter);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // forbidNonWhitelisted: true
    }),
  );
  await app.listen(process.env.PORT!);
}

void bootstrap();
