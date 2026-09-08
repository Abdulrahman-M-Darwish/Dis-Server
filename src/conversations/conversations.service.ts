import { Injectable } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Conversation } from './entities/conversation.entity';
import { DeleteResult, Model } from 'mongoose';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationsModel: Model<Conversation>,
  ) {}
  create(createConversationDto: CreateConversationDto) {
    return this.conversationsModel.create({
      ...createConversationDto,
      participants: createConversationDto.participants,
    });
  }

  // find all user conversations
  async findAll(userId: string) {
    const conversations = await this.conversationsModel
      .find({ participants: userId })
      .select('_id type groupName groupAvatarUrl participants lastMessage')
      .populate('participants', '_id name username avatarUrl status')
      .populate('lastMessage')
      .lean();
    return conversations;
  }

  async findOne(id: string) {
    const conversation = await this.conversationsModel
      .findOne({ _id: id })
      .select('_id type groupName groupAvatarUrl participants lastMessage')
      .populate('participants', '_id name username avatarUrl status')
      .populate('lastMessage')
      .lean();
    return conversation;
  }

  update(id: string, updateConversationDto: UpdateConversationDto) {
    return this.conversationsModel.updateOne(
      { _id: id },
      updateConversationDto,
    );
  }

  remove(id: string): Promise<DeleteResult> {
    return this.conversationsModel.deleteOne({ i_d: id });
  }
}
