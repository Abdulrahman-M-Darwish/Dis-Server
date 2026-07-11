import { Injectable } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Member } from './entities/member.entity';
import { DeleteResult, Model } from 'mongoose';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Member.name) private readonly membersModel: Model<Member>,
  ) {}

  create(createMemberDto: CreateMemberDto) {
    return this.membersModel.create(createMemberDto);
  }

  findAll() {
    return this.membersModel.find();
  }

  findOne(id: string) {
    return this.membersModel.findById(id);
  }

  update(id: string, updateMemberDto: UpdateMemberDto) {
    return this.membersModel.updateOne(
      { _id: id },
      { $set: { ...updateMemberDto } },
    );
  }

  remove(id: string): Promise<DeleteResult> {
    return this.membersModel.deleteOne({ _id: id });
  }
}
