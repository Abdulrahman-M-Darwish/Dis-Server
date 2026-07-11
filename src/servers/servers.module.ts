import { Module } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Server, serverSchema } from './entities/server.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Server.name, schema: serverSchema }]),
  ],
  controllers: [ServersController],
  providers: [ServersService],
})
export class ServersModule {}
