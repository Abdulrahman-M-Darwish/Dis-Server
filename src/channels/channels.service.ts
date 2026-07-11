import { Injectable } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Channel } from './entities/channel.entity';
import { DeleteResult, Model } from 'mongoose';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel.name) private readonly channelsModel: Model<Channel>,
  ) {}

  create(createChannelDto: CreateChannelDto) {
    return this.channelsModel.create(createChannelDto);
  }

  findAll() {
    return this.channelsModel.find();
  }

  findOne(id: string) {
    return this.channelsModel.findById(id);
  }

  update(id: string, updateChannelDto: UpdateChannelDto) {
    return this.channelsModel.updateOne(
      { _id: id },
      { $set: { ...updateChannelDto } },
    );
  }

  remove(id: string): Promise<DeleteResult> {
    return this.channelsModel.deleteOne({ _id: id });
  }
}
