import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Channel, channelSchema } from './entities/channel.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Channel.name, schema: channelSchema }]),
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService],
})
export class ChannelsModule {}
