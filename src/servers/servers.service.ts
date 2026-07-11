import { Injectable } from '@nestjs/common';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Server } from './entities/server.entity';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class ServersService {
  constructor(
    @InjectModel(Server.name) private readonly serversModel: Model<Server>,
  ) {}
  async create(createServerDto: CreateServerDto) {
    return this.serversModel.create(createServerDto);
  }

  findAll() {
    return `This action returns all servers`;
  }

  findOne(id: string) {
    return this.serversModel.find(
      mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { name: id },
    );
  }

  update(id: string, updateServerDto: UpdateServerDto) {
    return this.serversModel.updateOne(
      { _id: id },
      { $set: { ...updateServerDto } },
    );
  }

  remove(id: string) {
    return this.serversModel.deleteOne({ _id: id });
  }
}
