import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './entities/message.entity';
import { Model, Types } from 'mongoose';
import { MessagesGateway } from './messages.gateway';
import { GetMessagesDto } from './dto/get-messages.dto';
import { Conversation } from 'src/conversations/entities/conversation.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly messagesModel: Model<Message>,
    private readonly messagesGateway: MessagesGateway,
    @InjectModel(Conversation.name)
    private readonly conversationsModel: Model<Conversation>,
  ) {}
  async create(createMessageDto: CreateMessageDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const createdMessage = await (
      await this.messagesModel.create(createMessageDto)
    ).populate('reply');
    await this.messagesGateway.broadcastNewMessage(createdMessage);
    await this.conversationsModel.updateOne(
      { _id: createMessageDto.conversationId },
      {
        lastMessage: createdMessage._id,
      },
    );
    return createdMessage;
  }

  async findAll({
    conversationId,
    beforeMessageId,
    limit = 20,
  }: GetMessagesDto) {
    const query: { conversationId: string; _id?: object } = {
      conversationId,
    };

    if (beforeMessageId) {
      // Safely validate the cursor ID format before querying MongoDB
      if (!Types.ObjectId.isValid(beforeMessageId)) {
        throw new BadRequestException('Invalid message cursor ID format');
      }
      query._id = { $lt: new Types.ObjectId(beforeMessageId) };
    }

    const messages = await this.messagesModel
      .find(query)
      .sort({ _id: -1 })
      .populate('reply')
      .limit(limit);

    return messages.reverse();
  }

  findOne(id: string) {
    return this.messagesModel.findOne({ _id: id });
  }

  async update(id: string, updateMessageDto: UpdateMessageDto) {
    await this.messagesModel.updateOne(
      { _id: id },
      { ...updateMessageDto, isEdited: true },
    );
    const message = await this.findOne(id);
    await this.messagesGateway.update(message as Message);
    return message;
  }

  async remove(id: string) {
    const message = await this.findOne(id);
    await this.messagesModel.deleteOne({ _id: id });
    await this.messagesGateway.remove(message as Message);
    return { message: 'message Deleted' };
  }

  async getUnreadCount(
    conversationId: string,
    userId: string,
    lastReadAt: Date,
  ): Promise<number> {
    return this.messagesModel.countDocuments({
      conversationId,
      senderId: { $ne: userId }, // Exclude user's own messages
      createdAt: { $gt: lastReadAt },
    });
  }
}
